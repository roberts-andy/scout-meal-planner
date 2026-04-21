from __future__ import annotations

import logging
import os
import threading

from applicationinsights import TelemetryClient

logger = logging.getLogger(__name__)
AI_INGESTION_TRACK_PATH = "/v2.1/track"

_client: TelemetryClient | None = None
_client_lock = threading.Lock()


def _parse_connection_string(connection_string: str) -> tuple[str | None, str | None]:
    values: dict[str, str] = {}
    for part in connection_string.split(";"):
        if "=" not in part:
            continue
        key, value = part.split("=", 1)
        cleaned_key = key.strip().lower()
        cleaned_value = value.strip()
        if not cleaned_key or not cleaned_value:
            continue
        values[cleaned_key] = cleaned_value
    return values.get("instrumentationkey"), values.get("ingestionendpoint")


def _configure_endpoint(client: TelemetryClient, endpoint: str | None) -> None:
    if not endpoint:
        return
    try:
        client.channel.sender.service_endpoint_uri = f"{endpoint.rstrip('/')}{AI_INGESTION_TRACK_PATH}"
    except Exception:
        logger.debug("Unable to override Application Insights endpoint", exc_info=True)


def get_telemetry_client() -> TelemetryClient | None:
    global _client
    if _client is not None:
        return _client

    with _client_lock:
        if _client is not None:
            return _client

        connection_string = os.environ.get("APPINSIGHTS_CONNECTION_STRING")
        if not connection_string:
            return None

        instrumentation_key, endpoint = _parse_connection_string(connection_string)
        if not instrumentation_key:
            logger.warning("APPINSIGHTS_CONNECTION_STRING is set but missing InstrumentationKey")
            return None

        _client = TelemetryClient(instrumentation_key)
        _configure_endpoint(_client, endpoint)
    return _client


def _flush(client: TelemetryClient) -> None:
    try:
        client.flush()
    except Exception:
        logger.debug("Failed to flush Application Insights telemetry", exc_info=True)


def track_request(
    *,
    name: str,
    url: str,
    success: bool,
    duration_ms: float,
    response_code: int,
    http_method: str,
    properties: dict[str, str] | None = None,
) -> None:
    client = get_telemetry_client()
    if not client:
        return
    try:
        client.track_request(
            name=name,
            url=url,
            success=success,
            duration=duration_ms,
            response_code=str(response_code),
            http_method=http_method,
            properties=properties,
        )
        _flush(client)
    except Exception:
        logger.warning("Failed to emit request telemetry", exc_info=True)


def track_exception(exc: Exception, properties: dict[str, str] | None = None) -> None:
    client = get_telemetry_client()
    if not client:
        return
    try:
        client.track_exception(type=type(exc), value=exc, tb=exc.__traceback__, properties=properties)
        _flush(client)
    except Exception:
        logger.warning("Failed to emit exception telemetry", exc_info=True)


def track_custom_event(name: str, properties: dict[str, str] | None = None) -> None:
    client = get_telemetry_client()
    if not client:
        return
    try:
        client.track_event(name, properties=properties)
        _flush(client)
    except Exception:
        logger.warning("Failed to emit custom telemetry event '%s'", name, exc_info=True)
