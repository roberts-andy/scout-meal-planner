import logging

from fastapi import FastAPI
from contextlib import asynccontextmanager

from app.cosmosdb import close_database_clients, init_database
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
    try:
        yield
    finally:
        try:
            await close_database_clients()
        except Exception as exc:
            logger.warning("Failed to close Cosmos DB client(s): %s", exc)


app = FastAPI(title="Scout Meal Planner API", lifespan=lifespan)

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
