import logging

from fastapi import FastAPI
from contextlib import asynccontextmanager

from app.cosmosdb import init_database
from app.routers import (
    events,
    event_packed,
    event_purchased,
    recipes,
    feedback,
    troops,
    members,
    share,
    email_shopping_list,
    admin_flagged_content,
    health,
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(application: FastAPI):
    try:
        await init_database()
    except Exception as exc:
        logger.warning("Cosmos DB unavailable at startup — running without database: %s", exc)
    yield


app = FastAPI(title="Scout Meal Planner API", lifespan=lifespan)

# CORS: Not needed. Azure Static Web Apps proxies all /api requests,
# and local dev uses the SWA CLI proxy. See review decision 2026-04-19.
app.include_router(health.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(event_packed.router, prefix="/api")
app.include_router(event_purchased.router, prefix="/api")
app.include_router(recipes.router, prefix="/api")
app.include_router(feedback.router, prefix="/api")
app.include_router(troops.router, prefix="/api")
app.include_router(members.router, prefix="/api")
app.include_router(share.router, prefix="/api")
app.include_router(email_shopping_list.router, prefix="/api")
app.include_router(admin_flagged_content.router, prefix="/api")
