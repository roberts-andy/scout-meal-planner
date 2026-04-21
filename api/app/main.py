import asyncio
import logging
import os
import time

from fastapi import FastAPI
from contextlib import asynccontextmanager
from starlette.requests import Request

from app.logging_config import configure_logging

configure_logging()  # must run before any getLogger() calls in routers

from app.cosmosdb import DatabaseUnavailableError, close_database_clients, init_database
from app.feature_flags import init_app_config
from app.telemetry import track_exception, track_request

_DB_INIT_MAX_RETRIES = 5
_DB_INIT_BASE_DELAY = 2  # seconds, doubles each retry
from app.routers import (
    events,
    event_packed,
    event_purchased,
    recipes,
    feedback,
    troops,
    members,
    share,
    feature_flags,
    email_shopping_list,
    admin_flagged_content,
    health,
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(application: FastAPI):
    provider = None
    # ── Azure App Configuration (feature flags) ──
    try:
        endpoint = os.environ.get("APPCONFIG_ENDPOINT")
        if endpoint:
            from azure.appconfiguration.provider import load
            from azure.appconfiguration.provider import SettingSelector
            from azure.identity import DefaultAzureCredential

            provider = load(
                endpoint=endpoint,
                credential=DefaultAzureCredential(),
                feature_flag_enabled=True,
                feature_flag_selectors=[SettingSelector(key_filter="*")],
            )
            init_app_config(provider)
        else:
            init_app_config(None)
            logger.info("APPCONFIG_ENDPOINT not set — using env var / default feature flags")
    except Exception as exc:
        init_app_config(None)
        logger.warning("App Configuration unavailable — falling back to env var / defaults: %s", exc)
        track_exception(exc, properties={"phase": "startup", "component": "appconfig"})

    last_exc: Exception | None = None
    for attempt in range(1, _DB_INIT_MAX_RETRIES + 1):
        try:
            await init_database()
            logger.info("Cosmos DB initialized successfully (attempt %d)", attempt)
            last_exc = None
            break
        except Exception as exc:
            last_exc = exc
            delay = _DB_INIT_BASE_DELAY * (2 ** (attempt - 1))
            logger.warning(
                "Cosmos DB init attempt %d/%d failed: %s — retrying in %ds",
                attempt, _DB_INIT_MAX_RETRIES, exc, delay,
            )
            if attempt < _DB_INIT_MAX_RETRIES:
                await asyncio.sleep(delay)
    if last_exc:
        logger.error(
            "Cosmos DB unavailable after %d attempts — running without database: %s",
            _DB_INIT_MAX_RETRIES, last_exc, exc_info=True,
        )
        track_exception(last_exc, properties={"phase": "startup", "component": "cosmosdb"})
    try:
        yield
    finally:
        if provider is not None:
            try:
                provider.close()
            except Exception as exc:
                logger.warning("Failed to close App Config provider: %s", exc)
        try:
            await close_database_clients()
        except Exception as exc:
            logger.warning("Failed to close Cosmos DB client(s): %s", exc)


app = FastAPI(title="Scout Meal Planner API", lifespan=lifespan)


# ---------------------------------------------------------------------------
# Global exception handlers — return structured JSON instead of opaque 500s
# ---------------------------------------------------------------------------

from fastapi.responses import JSONResponse
from azure.cosmos.exceptions import CosmosHttpResponseError


@app.exception_handler(DatabaseUnavailableError)
async def database_unavailable_handler(request: Request, exc: DatabaseUnavailableError):
    logger.error("Database unavailable: %s (path=%s)", exc, request.url.path)
    return JSONResponse(
        status_code=503,
        content={"detail": "Service temporarily unavailable — database not ready"},
    )


@app.exception_handler(CosmosHttpResponseError)
async def cosmos_error_handler(request: Request, exc: CosmosHttpResponseError):
    logger.error("Cosmos DB error %s: %s (path=%s)", exc.status_code, exc.message, request.url.path)
    track_exception(exc, properties={"path": request.url.path, "method": request.method})
    if exc.status_code == 429:
        return JSONResponse(
            status_code=503,
            content={"detail": "Service temporarily unavailable — rate limited"},
        )
    return JSONResponse(
        status_code=502,
        content={"detail": "Database operation failed"},
    )


@app.middleware("http")
async def application_insights_middleware(request: Request, call_next):
    started = time.perf_counter()
    response_code = 500
    success = False
    try:
        response = await call_next(request)
        response_code = response.status_code
        success = response_code < 500
        return response
    except Exception as exc:
        track_exception(exc, properties={
            "path": request.url.path,
            "method": request.method,
        })
        raise
    finally:
        duration_ms = (time.perf_counter() - started) * 1000
        track_request(
            name=f"{request.method} {request.url.path}",
            url=str(request.url),
            success=success,
            duration_ms=duration_ms,
            response_code=response_code,
            http_method=request.method,
            properties={"path": request.url.path},
        )

# CORS: Not needed. Azure Static Web Apps proxies all /api requests,
# and local dev uses the SWA CLI proxy. See
# .copilot-tracking/reviews/code-reviews/main/review.md.
app.include_router(health.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(event_packed.router, prefix="/api")
app.include_router(event_purchased.router, prefix="/api")
app.include_router(recipes.router, prefix="/api")
app.include_router(feedback.router, prefix="/api")
app.include_router(troops.router, prefix="/api")
app.include_router(members.router, prefix="/api")
app.include_router(share.router, prefix="/api")
app.include_router(feature_flags.router, prefix="/api")
app.include_router(email_shopping_list.router, prefix="/api")
app.include_router(admin_flagged_content.router, prefix="/api")
