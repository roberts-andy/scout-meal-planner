from __future__ import annotations

import logging
import time
import uuid

from fastapi import APIRouter, HTTPException, Request

from app.cosmosdb import get_by_id, get_all_by_troop, update_item, query_items
from app.middleware.auth import RequireTroopContext, forbidden
from app.middleware.roles import check_permission

logger = logging.getLogger(__name__)
router = APIRouter()

EVENTS_CONTAINER = "events"
RECIPES_CONTAINER = "recipes"


def _generate_share_token() -> str:
    return uuid.uuid4().hex + uuid.uuid4().hex


def _get_share_url(request: Request, token: str) -> str:
    base = str(request.base_url).rstrip("/")
    return f"{base}/share/{token}"


@router.get("/events/{event_id}/share")
async def get_event_share(event_id: str, request: Request, auth: RequireTroopContext):
    if not check_permission(auth.role, "manageEvents"):
        forbidden()

    existing = await get_by_id(EVENTS_CONTAINER, event_id, auth.troopId)
    if not existing:
        raise HTTPException(status_code=404, detail="Event not found")

    token = existing.get("shareToken")
    return {
        "shareToken": token,
        "shareUrl": _get_share_url(request, token) if token else None,
    }


@router.post("/events/{event_id}/share")
async def create_event_share(event_id: str, request: Request, auth: RequireTroopContext):
    if not check_permission(auth.role, "manageEvents"):
        forbidden()

    existing = await get_by_id(EVENTS_CONTAINER, event_id, auth.troopId)
    if not existing:
        raise HTTPException(status_code=404, detail="Event not found")

    share_token = _generate_share_token()
    await update_item(EVENTS_CONTAINER, event_id, {
        **existing,
        "shareToken": share_token,
        "shareTokenUpdatedAt": int(time.time() * 1000),
        "updatedAt": int(time.time() * 1000),
        "updatedBy": {"userId": auth.userId, "displayName": auth.displayName},
    }, auth.troopId)

    return {
        "shareToken": share_token,
        "shareUrl": _get_share_url(request, share_token),
    }


@router.delete("/events/{event_id}/share", status_code=204)
async def delete_event_share(event_id: str, auth: RequireTroopContext):
    if not check_permission(auth.role, "manageEvents"):
        forbidden()

    existing = await get_by_id(EVENTS_CONTAINER, event_id, auth.troopId)
    if not existing:
        raise HTTPException(status_code=404, detail="Event not found")

    next_event = {k: v for k, v in existing.items() if k not in ("shareToken", "shareTokenUpdatedAt")}
    await update_item(EVENTS_CONTAINER, event_id, {
        **next_event,
        "updatedAt": int(time.time() * 1000),
        "updatedBy": {"userId": auth.userId, "displayName": auth.displayName},
    }, auth.troopId)


@router.get("/share/{token}")
async def get_shared_event(token: str):
    events = await query_items(
        EVENTS_CONTAINER,
        "SELECT * FROM c WHERE c.shareToken = @token",
        [{"name": "@token", "value": token}],
    )
    if not events:
        raise HTTPException(status_code=404, detail="Shared event not found")

    event = events[0]
    all_recipes = await get_all_by_troop(RECIPES_CONTAINER, event["troopId"])

    recipe_ids: set[str] = set()
    for day in event.get("days") or []:
        for meal in day.get("meals") or []:
            if meal.get("recipeId"):
                recipe_ids.add(meal["recipeId"])

    recipes = [
        {
            "id": r["id"],
            "name": r.get("name"),
            "servings": r.get("servings"),
            "ingredients": [
                {
                    "id": ing.get("id"),
                    "name": ing.get("name"),
                    "quantity": ing.get("quantity"),
                    "unit": ing.get("unit"),
                    "category": ing.get("category"),
                }
                for ing in r.get("ingredients") or []
            ],
            "variations": [
                {
                    "id": v.get("id"),
                    "equipment": v.get("equipment", []),
                }
                for v in r.get("variations") or []
            ],
        }
        for r in all_recipes
        if r["id"] in recipe_ids
    ]

    return {
        "event": {
            "id": event["id"],
            "name": event.get("name"),
            "startDate": event.get("startDate"),
            "endDate": event.get("endDate"),
            "hike": event.get("hike"),
            "highAltitude": event.get("highAltitude"),
            "tentCamping": event.get("tentCamping"),
            "cabinCamping": event.get("cabinCamping"),
            "days": [
                {
                    "date": day.get("date"),
                    "meals": [
                        {
                            "id": meal.get("id"),
                            "type": meal.get("type"),
                            "course": meal.get("course"),
                            "recipeId": meal.get("recipeId"),
                            "scoutCount": meal.get("scoutCount"),
                            "isTrailside": meal.get("isTrailside"),
                            "isTimeConstrained": meal.get("isTimeConstrained"),
                        }
                        for meal in day.get("meals") or []
                    ],
                }
                for day in event.get("days") or []
            ],
        },
        "recipes": recipes,
    }
