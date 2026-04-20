from __future__ import annotations

import time

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from azure.cosmos.exceptions import CosmosHttpResponseError

from app.cosmosdb import get_by_id, update_item
from app.middleware.auth import RequireTroopContext, forbidden
from app.middleware.roles import check_permission
from app.schemas import TogglePurchasedItem

router = APIRouter()

CONTAINER = "events"
MAX_RETRY_ATTEMPTS = 3


@router.patch("/events/{event_id}/purchased")
async def toggle_purchased(event_id: str, body: TogglePurchasedItem, auth: RequireTroopContext):
    if not check_permission(auth.role, "viewContent"):
        forbidden()

    for _ in range(MAX_RETRY_ATTEMPTS):
        existing = await get_by_id(CONTAINER, event_id, auth.troopId)
        if not existing:
            return JSONResponse({"error": "Event not found"}, status_code=404)

        purchased_items = set(existing.get("purchasedItems") or [])
        if body.purchased:
            purchased_items.add(body.item)
        else:
            purchased_items.discard(body.item)

        try:
            return await update_item(
                CONTAINER,
                event_id,
                {
                    **existing,
                    "id": event_id,
                    "troopId": auth.troopId,
                    "purchasedItems": list(purchased_items),
                    "updatedAt": int(time.time() * 1000),
                    "updatedBy": {"userId": auth.userId, "displayName": auth.displayName},
                },
                auth.troopId,
                if_match=existing.get("_etag"),
            )
        except CosmosHttpResponseError as exc:
            if exc.status_code == 412:
                continue
            raise

    return JSONResponse(
        {"error": "Failed to update purchased items after retries due to concurrent modifications"},
        status_code=409,
    )
