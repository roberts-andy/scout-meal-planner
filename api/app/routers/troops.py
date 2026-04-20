from __future__ import annotations

import logging
import os
import secrets
import time
import uuid

from fastapi import APIRouter, Response
from fastapi.responses import JSONResponse

from app.cosmosdb import get_by_id, create_item, update_item, query_items, delete_item
from app.middleware.auth import RequireToken, RequireTroopContext, forbidden, get_troop_context, validate_token
from app.middleware.roles import check_permission
from app.schemas import CreateTroop, UpdateTroop, JoinTroop

logger = logging.getLogger(__name__)
router = APIRouter()

CONTAINER = "troops"
CASCADE_DELETE_CONTAINERS = ("members", "events", "feedback", "recipes")


def _generate_invite_code() -> str:
    return "TROOP-" + secrets.token_hex(2).upper()[:4]


def _to_first_name(display_name: str) -> str:
    return display_name.strip().split()[0] if display_name.strip() else ""


@router.post("/troops", status_code=201)
async def create_troop(body: CreateTroop, claims: RequireToken):
    now = int(time.time() * 1000)
    troop_id = str(uuid.uuid4())

    troop = await create_item(CONTAINER, {
        "id": troop_id,
        "name": body.name,
        "inviteCode": _generate_invite_code(),
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
        return JSONResponse({"error": "Troop not found"}, status_code=404)
    return troop


@router.put("/troops")
async def update_troop(body: UpdateTroop, auth: RequireTroopContext):
    if not check_permission(auth.role, "manageTroop"):
        forbidden()
    existing = await get_by_id(CONTAINER, auth.troopId)
    if not existing:
        return Response(status_code=404)

    updated = {**existing, **body.model_dump(), "id": auth.troopId, "updatedAt": int(time.time() * 1000)}
    result = await update_item(CONTAINER, auth.troopId, updated)
    return result


@router.delete("/troops", status_code=204)
async def delete_troop(auth: RequireTroopContext):
    if not check_permission(auth.role, "manageTroop"):
        forbidden()

    existing = await get_by_id(CONTAINER, auth.troopId)
    if not existing:
        return JSONResponse({"error": "Troop not found"}, status_code=404)

    troop_param = [{"name": "@troopId", "value": auth.troopId}]
    for container in CASCADE_DELETE_CONTAINERS:
        items = await query_items(
            container,
            "SELECT c.id FROM c WHERE c.troopId = @troopId",
            troop_param,
        )
        for item in items:
            await delete_item(container, item["id"], auth.troopId)

    await delete_item(CONTAINER, auth.troopId)


@router.post("/troops/join", status_code=201)
async def join_troop(body: JoinTroop, claims: RequireToken):
    troops = await query_items(
        CONTAINER,
        "SELECT * FROM c WHERE c.inviteCode = @code",
        [{"name": "@code", "value": body.inviteCode}],
    )

    if not troops:
        return JSONResponse({"error": "Invalid invite code"}, status_code=404)

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
        return JSONResponse({"error": "Already a member of this troop"}, status_code=409)

    member = await create_item("members", {
        "id": str(uuid.uuid4()),
        "troopId": troop["id"],
        "displayName": _to_first_name(claims.displayName),
        "role": "scout",
        "status": "pending",
    })

    return {"troop": troop, "member": member}
