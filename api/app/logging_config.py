"""Structured logging configuration with Application Insights bridge.

Call ``configure_logging()`` once at startup (before any other imports that use
``logging.getLogger``) to:

* Emit **JSON-structured** log lines to *stderr* so Azure App Service can
  capture them in Log Stream / container logs.
* Forward WARNING-and-above records to Application Insights as trace
  telemetry, making them queryable alongside requests and exceptions.
"""

from __future__ import annotations

import json
import logging
import logging.config
import traceback
from datetime import datetime, timezone


# ---------------------------------------------------------------------------
# JSON formatter – one JSON object per line for easy parsing
# ---------------------------------------------------------------------------

class JSONFormatter(logging.Formatter):
    """Render each log record as a single-line JSON object."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry: dict = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info and record.exc_info[0] is not None:
            log_entry["exception"] = "".join(traceback.format_exception(*record.exc_info))
        if hasattr(record, "props"):
            log_entry["properties"] = record.props  # type: ignore[attr-defined]
        return json.dumps(log_entry, default=str)


# ---------------------------------------------------------------------------
# Application Insights handler – forwards log records as trace telemetry
# ---------------------------------------------------------------------------

class AppInsightsHandler(logging.Handler):
    """Push log records to Application Insights via ``track_trace``.

    Only records at *WARNING* or above are forwarded by default (controlled
    via the handler's ``level``).  The handler is intentionally lazy so it
    does nothing if the telemetry connection string is not configured.
    """

    _LEVEL_MAP = {
        logging.DEBUG: 0,
        logging.INFO: 1,
        logging.WARNING: 2,
        logging.ERROR: 3,
        logging.CRITICAL: 4,
    }

    def emit(self, record: logging.LogRecord) -> None:
        try:
            from app.telemetry import track_trace  # lazy import avoids circular deps

            severity = self._LEVEL_MAP.get(record.levelno, 1)
            properties = {
                "logger": record.name,
                "module": record.module,
            }
            if record.exc_info and record.exc_info[0] is not None:
                properties["exception"] = "".join(traceback.format_exception(*record.exc_info))
            track_trace(record.getMessage(), severity_level=severity, properties=properties)
        except Exception:
            # Never let telemetry failures break the app
            pass


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

LOGGING_CONFIG: dict = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": f"{__name__}.JSONFormatter",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json",
            "stream": "ext://sys.stderr",
        },
        "appinsights": {
            "class": f"{__name__}.AppInsightsHandler",
            "level": "WARNING",
        },
    },
    "root": {
        "level": "INFO",
        "handlers": ["console", "appinsights"],
    },
    "loggers": {
        # Quieten noisy Azure SDK loggers
        "azure.core": {"level": "WARNING"},
        "azure.identity": {"level": "WARNING"},
        "azure.cosmos": {"level": "WARNING"},
        # Keep uvicorn access logs at INFO
        "uvicorn.access": {"level": "INFO"},
        "uvicorn.error": {"level": "INFO"},
    },
}


def configure_logging() -> None:
    """Apply the structured logging configuration."""
    logging.config.dictConfig(LOGGING_CONFIG)
