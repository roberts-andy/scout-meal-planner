from __future__ import annotations

import logging
import os
import secrets
import time
import uuid
from dataclasses import asdict

from azure.cosmos.exceptions import CosmosHttpResponseError
from fastapi import APIRouter, HTTPException

from app.cosmosdb import get_by_id, create_item, update_item, query_items, delete_item
from app.middleware.auth import RequireToken, RequireTroopContext, forbidden, get_troop_context, validate_token
from app.middleware.moderation import moderate_text_fields, ModerationField
from app.middleware.roles import check_permission
from app.schemas import CreateTroop, UpdateTroop, JoinTroop

logger = logging.getLogger(__name__)
router = APIRouter()

CONTAINER = "troops"
CASCADE_DELETE_CONTAINERS = ("members", "events", "feedback", "recipes")


def _generate_invite_code() -> str:
    return "TROOP-" + secrets.token_hex(4).upper()


def _to_first_name(display_name: str) -> str:
    return display_name.strip().split()[0] if display_name.strip() else ""


@router.post("/troops", status_code=201)
async def create_troop(body: CreateTroop, claims: RequireToken):
    raise HTTPException(status_code=403, detail="Troop creation is currently disabled")
    now = int(time.time() * 1000)
    troop_id = str(uuid.uuid4())
    moderation = await moderate_text_fields([ModerationField(field="name", text=body.name)])

    troop = await create_item(CONTAINER, {
        "id": troop_id,
        "name": body.name,
        "inviteCode": _generate_invite_code(),
        "moderation": asdict(moderation),
        "createdBy": claims.userId,
        "createdAt": now,
        "updatedAt": now,
    })

    member = await create_item("members", {
        "id": str(uuid.uuid4()),
        "troopId": troop_id,
        "userId": claims.userId,
        "email": claims.email,
        "displayName": claims.displayName,
        "role": "troopAdmin",
        "status": "active",
        "joinedAt": now,
    })

    return {"troop": troop, "member": member}


@router.get("/troops")
async def get_troop(auth: RequireTroopContext):
    troop = await get_by_id(CONTAINER, auth.troopId)
    if not troop:
        raise HTTPException(status_code=404, detail="Troop not found")
    return troop


@router.put("/troops")
async def update_troop(body: UpdateTroop, auth: RequireTroopContext):
    if not check_permission(auth.role, "manageTroop"):
        forbidden()
    existing = await get_by_id(CONTAINER, auth.troopId)
    if not existing:
        raise HTTPException(status_code=404, detail="Troop not found")
    moderation = await moderate_text_fields([ModerationField(field="name", text=body.name)])

    updated = {
        **existing,
        **body.model_dump(),
        "id": auth.troopId,
        "moderation": asdict(moderation),
        "updatedAt": int(time.time() * 1000),
    }
    result = await update_item(CONTAINER, auth.troopId, updated)
    return result


@router.delete("/troops", status_code=204)
async def delete_troop(auth: RequireTroopContext):
    """Delete the troop and cascade-delete troop-scoped records."""
    if not check_permission(auth.role, "manageTroop"):
        forbidden()

    existing = await get_by_id(CONTAINER, auth.troopId)
    if not existing:
        raise HTTPException(status_code=404, detail="Troop not found")

    failures: list[dict] = []

    troop_param = [{"name": "@troopId", "value": auth.troopId}]
    for container in CASCADE_DELETE_CONTAINERS:
        try:
            items = await query_items(
                container,
                "SELECT c.id FROM c WHERE c.troopId = @troopId",
                troop_param,
            )
        except Exception as exc:
            failures.append({"container": container, "operation": "query", "error": type(exc).__name__})
            continue

        for item in items:
            try:
                await delete_item(container, item["id"], auth.troopId)
            except CosmosHttpResponseError as exc:
                if exc.status_code == 404:
                    continue
                failures.append({
                    "container": container,
                    "operation": "delete",
                    "id": item.get("id"),
                    "error": type(exc).__name__,
                })
            except Exception as exc:
                if getattr(exc, "status_code", None) == 404:
                    continue
                failures.append({
                    "container": container,
                    "operation": "delete",
                    "id": item.get("id"),
                    "error": type(exc).__name__,
                })

    try:
        await delete_item(CONTAINER, auth.troopId)
    except CosmosHttpResponseError as exc:
        if exc.status_code != 404:
            failures.append({"container": CONTAINER, "operation": "delete", "id": auth.troopId, "error": type(exc).__name__})
    except Exception as exc:
        if getattr(exc, "status_code", None) != 404:
            failures.append({"container": CONTAINER, "operation": "delete", "id": auth.troopId, "error": type(exc).__name__})

    if failures:
        logger.error("Troop %s deletion completed with failures: %s", auth.troopId, failures)
        raise HTTPException(status_code=500, detail={"error": "Troop deletion failed", "failures": failures})


@router.post("/troops/join", status_code=201)
async def join_troop(body: JoinTroop, claims: RequireToken):
    troops = await query_items(
        CONTAINER,
        "SELECT * FROM c WHERE c.inviteCode = @code",
        [{"name": "@code", "value": body.inviteCode}],
    )

    if not troops:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    troop = troops[0]

    existing = await query_items(
        "members",
        "SELECT * FROM c WHERE c.troopId = @troopId AND c.userId = @userId",
        [
            {"name": "@troopId", "value": troop["id"]},
            {"name": "@userId", "value": claims.userId},
        ],
    )

    if existing:
        raise HTTPException(status_code=409, detail="Already a member of this troop")

    member = await create_item("members", {
        "id": str(uuid.uuid4()),
        "troopId": troop["id"],
        "userId": claims.userId,
        "email": claims.email,
        "displayName": _to_first_name(claims.displayName),
        "role": "scout",
        "status": "pending",
        "joinedAt": int(time.time() * 1000),
    })

    return {"troop": troop, "member": member}
