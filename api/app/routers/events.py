from __future__ import annotations

import logging
import uuid
from dataclasses import asdict

from fastapi import APIRouter, HTTPException
from fastapi import Query

from app.audit import audit_create, audit_update
from app.cosmosdb import (
    create_item,
    delete_item,
    get_all_by_troop,
    get_by_id,
    query_items,
    query_items_paginated,
    update_item,
)
from app.event_tags import with_migrated_tags
from app.middleware.auth import RequireTroopContext, forbidden
from app.middleware.moderation import moderate_text_fields, ModerationField
from app.middleware.roles import check_permission
from app.schemas import CreateEvent, UpdateEvent
from app.telemetry import track_custom_event

logger = logging.getLogger(__name__)
router = APIRouter()

CONTAINER = "events"


def _extract_meal_recipe_assignments(event: dict) -> dict[str, str]:
    assignments: dict[str, str] = {}
    for day in event.get("days") or []:
        if not isinstance(day, dict):
            continue
        for meal in day.get("meals") or []:
            if not isinstance(meal, dict):
                continue
            meal_id = meal.get("id")
            if not meal_id:
                continue
            recipe_id = meal.get("recipeId")
            if not recipe_id:
                continue
            assignments[str(meal_id)] = str(recipe_id)
    return assignments


def _event_moderation_fields(data: CreateEvent | UpdateEvent) -> list[ModerationField]:
    fields: list[ModerationField] = []
    if data.name is not None:
        fields.append(ModerationField(field="name", text=data.name))
    if data.description is not None:
        fields.append(ModerationField(field="description", text=data.description))
    if data.notes is not None:
        fields.append(ModerationField(field="notes", text=data.notes))

    for day_index, day in enumerate(data.days or []):
        for meal_index, meal in enumerate(day.meals):
            if meal.notes is not None:
                fields.append(ModerationField(field=f"days[{day_index}].meals[{meal_index}].notes", text=meal.notes))
    return fields


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
    return {"items": [with_migrated_tags(event) for event in items], "continuationToken": next_token}


@router.get("/events/{event_id}")
async def get_event(event_id: str, auth: RequireTroopContext):
    event = await get_by_id(CONTAINER, event_id, auth.troopId)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return with_migrated_tags(event)


@router.post("/events", status_code=201)
async def create_event(body: CreateEvent, auth: RequireTroopContext):
    if not check_permission(auth.role, "manageEvents"):
        forbidden()
    moderation = await moderate_text_fields(_event_moderation_fields(body))
    event = await create_item(CONTAINER, {
        "id": str(uuid.uuid4()),
        "troopId": auth.troopId,
        **body.model_dump(),
        "moderation": asdict(moderation),
        **audit_create(auth),
    })
    track_custom_event("event_created", properties={
        "eventId": event["id"],
        "troopId": auth.troopId,
    })

    assigned_count = len(_extract_meal_recipe_assignments(event))
    if assigned_count > 0:
        track_custom_event("recipe_assigned", properties={
            "eventId": event["id"],
            "troopId": auth.troopId,
            "assignmentCount": str(assigned_count),
        })
    return with_migrated_tags(event)


@router.put("/events/{event_id}")
async def update_event(event_id: str, body: UpdateEvent, auth: RequireTroopContext):
    if not check_permission(auth.role, "manageEvents"):
        forbidden()
    existing = await get_by_id(CONTAINER, event_id, auth.troopId)
    if not existing:
        raise HTTPException(status_code=404, detail="Event not found")
    moderation = await moderate_text_fields(_event_moderation_fields(body))
    event = await update_item(CONTAINER, event_id, {
        **existing,
        **body.model_dump(exclude_unset=True),
        "id": event_id,
        "troopId": auth.troopId,
        "moderation": asdict(moderation),
        **audit_update(auth),
    }, auth.troopId)

    previous_assignments = _extract_meal_recipe_assignments(existing)
    updated_assignments = _extract_meal_recipe_assignments(event)
    assigned_count = sum(
        1 for meal_key, recipe_id in updated_assignments.items()
        if previous_assignments.get(meal_key) != recipe_id
    )
    if assigned_count > 0:
        track_custom_event("recipe_assigned", properties={
            "eventId": event_id,
            "troopId": auth.troopId,
            "assignmentCount": str(assigned_count),
        })
    return with_migrated_tags(event)


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
