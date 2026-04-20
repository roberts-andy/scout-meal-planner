from __future__ import annotations

import time

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.cosmosdb import get_by_id, update_item
from app.middleware.auth import RequireTroopContext, forbidden
from app.middleware.roles import check_permission
from app.schemas import TogglePackedItem

router = APIRouter()

CONTAINER = "events"


@router.patch("/events/{event_id}/packed")
async def toggle_packed(event_id: str, body: TogglePackedItem, auth: RequireTroopContext):
    if not check_permission(auth.role, "viewContent"):
        forbidden()

    existing = await get_by_id(CONTAINER, event_id, auth.troopId)
    if not existing:
        return JSONResponse({"error": "Event not found"}, status_code=404)

    packed_items = set(existing.get("packedItems") or [])
    if body.packed:
        packed_items.add(body.item)
    else:
        packed_items.discard(body.item)

    updated = await update_item(
        CONTAINER,
        event_id,
        {
            **existing,
            "id": event_id,
            "troopId": auth.troopId,
            "packedItems": list(packed_items),
            "updatedAt": int(time.time() * 1000),
            "updatedBy": {"userId": auth.userId, "displayName": auth.displayName},
        },
        auth.troopId,
    )
    return updated
