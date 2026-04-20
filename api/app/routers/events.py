from __future__ import annotations

import logging
import time
import uuid

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.cosmosdb import get_all_by_troop, get_by_id, create_item, update_item, delete_item, query_items
from app.middleware.auth import RequireTroopContext, forbidden
from app.middleware.roles import check_permission
from app.schemas import CreateEvent, UpdateEvent

logger = logging.getLogger(__name__)
router = APIRouter()

CONTAINER = "events"


@router.get("/events")
async def list_events(auth: RequireTroopContext):
    events = await get_all_by_troop(CONTAINER, auth.troopId)
    return events


@router.get("/events/{event_id}")
async def get_event(event_id: str, auth: RequireTroopContext):
    event = await get_by_id(CONTAINER, event_id, auth.troopId)
    if not event:
        return JSONResponse({"error": "Event not found"}, status_code=404)
    return event


@router.post("/events", status_code=201)
async def create_event(body: CreateEvent, auth: RequireTroopContext):
    if not check_permission(auth.role, "manageEvents"):
        forbidden()
    now = int(time.time() * 1000)
    audit = {"userId": auth.userId, "displayName": auth.displayName}
    event = await create_item(CONTAINER, {
        "id": str(uuid.uuid4()),
        "troopId": auth.troopId,
        **body.model_dump(),
        "createdAt": now,
        "updatedAt": now,
        "createdBy": audit,
        "updatedBy": audit,
    })
    return event


@router.put("/events/{event_id}")
async def update_event(event_id: str, body: UpdateEvent, auth: RequireTroopContext):
    if not check_permission(auth.role, "manageEvents"):
        forbidden()
    existing = await get_by_id(CONTAINER, event_id, auth.troopId)
    if not existing:
        return JSONResponse({"error": "Event not found"}, status_code=404)
    event = await update_item(CONTAINER, event_id, {
        **existing,
        **body.model_dump(exclude_unset=True),
        "id": event_id,
        "troopId": auth.troopId,
        "updatedAt": int(time.time() * 1000),
        "updatedBy": {"userId": auth.userId, "displayName": auth.displayName},
    }, auth.troopId)
    return event


@router.delete("/events/{event_id}", status_code=204)
async def delete_event(event_id: str, auth: RequireTroopContext):
    if not check_permission(auth.role, "manageEvents"):
        forbidden()
    feedback_items = await query_items(
        "feedback",
        "SELECT * FROM c WHERE c.eventId = @eventId AND c.troopId = @troopId",
        [
            {"name": "@eventId", "value": event_id},
            {"name": "@troopId", "value": auth.troopId},
        ],
    )
    for feedback_item in feedback_items:
        await delete_item("feedback", feedback_item["id"], feedback_item["troopId"])
    await delete_item(CONTAINER, event_id, auth.troopId)
