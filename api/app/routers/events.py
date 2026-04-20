from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, HTTPException
from fastapi import Query

from app.audit import audit_create, audit_update
from app.cosmosdb import (
    create_item,
    delete_item,
    get_by_id,
    query_items,
    query_items_paginated,
    update_item,
)
from app.middleware.auth import RequireTroopContext, forbidden
from app.middleware.roles import check_permission
from app.schemas import CreateEvent, UpdateEvent

logger = logging.getLogger(__name__)
router = APIRouter()

CONTAINER = "events"


@router.get("/events")
async def list_events(
    auth: RequireTroopContext,
    limit: int = Query(default=50, ge=1, le=100),
    continuationToken: str | None = None,
):
    items, next_token = await query_items_paginated(
        CONTAINER,
        "SELECT * FROM c WHERE c.troopId = @troopId",
        [{"name": "@troopId", "value": auth.troopId}],
        limit=limit,
        continuation_token=continuationToken,
    )
    return {"items": items, "continuationToken": next_token}


@router.get("/events/{event_id}")
async def get_event(event_id: str, auth: RequireTroopContext):
    event = await get_by_id(CONTAINER, event_id, auth.troopId)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.post("/events", status_code=201)
async def create_event(body: CreateEvent, auth: RequireTroopContext):
    if not check_permission(auth.role, "manageEvents"):
        forbidden()
    event = await create_item(CONTAINER, {
        "id": str(uuid.uuid4()),
        "troopId": auth.troopId,
        **body.model_dump(),
        **audit_create(auth),
    })
    return event


@router.put("/events/{event_id}")
async def update_event(event_id: str, body: UpdateEvent, auth: RequireTroopContext):
    if not check_permission(auth.role, "manageEvents"):
        forbidden()
    existing = await get_by_id(CONTAINER, event_id, auth.troopId)
    if not existing:
        raise HTTPException(status_code=404, detail="Event not found")
    event = await update_item(CONTAINER, event_id, {
        **existing,
        **body.model_dump(exclude_unset=True),
        "id": event_id,
        "troopId": auth.troopId,
        **audit_update(auth),
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
