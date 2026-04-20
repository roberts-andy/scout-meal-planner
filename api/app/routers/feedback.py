from __future__ import annotations

import logging
import time
import uuid
from dataclasses import asdict

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.cosmosdb import get_all_by_troop, get_by_id, create_item, update_item, delete_item, query_items
from app.middleware.auth import RequireTroopContext, forbidden
from app.middleware.roles import check_permission
from app.middleware.moderation import moderate_text_fields, can_view_moderated_content, ModerationField
from app.schemas import CreateFeedback, UpdateFeedback

logger = logging.getLogger(__name__)
router = APIRouter()

CONTAINER = "feedback"
EVENTS_CONTAINER = "events"


@router.get("/feedback")
async def list_feedback(auth: RequireTroopContext):
    feedback = await get_all_by_troop(CONTAINER, auth.troopId)
    return [f for f in feedback if can_view_moderated_content(auth.role, f.get("moderation"))]


@router.post("/feedback", status_code=201)
async def create_feedback(body: CreateFeedback, auth: RequireTroopContext):
    if not check_permission(auth.role, "submitFeedback"):
        forbidden()
    now = int(time.time() * 1000)
    audit = {"userId": auth.userId, "displayName": auth.displayName}
    moderation = await moderate_text_fields([
        ModerationField(field="comments", text=body.comments),
        ModerationField(field="whatWorked", text=body.whatWorked),
        ModerationField(field="whatToChange", text=body.whatToChange),
    ])
    feedback = await create_item(CONTAINER, {
        "id": str(uuid.uuid4()),
        "troopId": auth.troopId,
        **body.model_dump(),
        "moderation": asdict(moderation),
        "createdAt": now,
        "updatedAt": now,
        "createdBy": audit,
        "updatedBy": audit,
    })
    return feedback


@router.put("/feedback/{feedback_id}")
async def update_feedback(feedback_id: str, body: UpdateFeedback, auth: RequireTroopContext):
    if not check_permission(auth.role, "submitFeedback"):
        forbidden()
    existing = await get_by_id(CONTAINER, feedback_id, auth.troopId)
    if not existing:
        return JSONResponse({"error": "Feedback not found"}, status_code=404)
    moderation = await moderate_text_fields([
        ModerationField(field="comments", text=body.comments),
        ModerationField(field="whatWorked", text=body.whatWorked),
        ModerationField(field="whatToChange", text=body.whatToChange),
    ])
    feedback = await update_item(CONTAINER, feedback_id, {
        **existing,
        **body.model_dump(),
        "id": feedback_id,
        "troopId": auth.troopId,
        "moderation": asdict(moderation),
        "updatedAt": int(time.time() * 1000),
        "updatedBy": {"userId": auth.userId, "displayName": auth.displayName},
    }, auth.troopId)
    return feedback


@router.delete("/feedback/{feedback_id}", status_code=204)
async def delete_feedback(feedback_id: str, auth: RequireTroopContext):
    if not check_permission(auth.role, "manageEvents"):
        forbidden()
    await delete_item(CONTAINER, feedback_id, auth.troopId)


@router.get("/feedback/event/{event_id}")
async def feedback_by_event(event_id: str, auth: RequireTroopContext):
    feedback = await query_items(
        CONTAINER,
        "SELECT * FROM c WHERE c.eventId = @eventId AND c.troopId = @troopId",
        [
            {"name": "@eventId", "value": event_id},
            {"name": "@troopId", "value": auth.troopId},
        ],
    )
    return [f for f in feedback if can_view_moderated_content(auth.role, f.get("moderation"))]


@router.get("/feedback/recipe/{recipe_id}")
async def feedback_by_recipe(recipe_id: str, auth: RequireTroopContext):
    feedback = await query_items(
        CONTAINER,
        "SELECT * FROM c WHERE c.recipeId = @recipeId AND c.troopId = @troopId",
        [
            {"name": "@recipeId", "value": recipe_id},
            {"name": "@troopId", "value": auth.troopId},
        ],
    )
    visible = [f for f in feedback if can_view_moderated_content(auth.role, f.get("moderation"))]

    events = await get_all_by_troop(EVENTS_CONTAINER, auth.troopId)
    events_by_id = {e["id"]: e for e in events}

    return [
        {
            **entry,
            "eventName": events_by_id.get(entry.get("eventId", ""), {}).get("name"),
            "eventDate": events_by_id.get(entry.get("eventId", ""), {}).get("startDate"),
        }
        for entry in visible
    ]
