from __future__ import annotations

import logging
import time
import uuid
from dataclasses import asdict

from fastapi import APIRouter, HTTPException, Request
from fastapi import Query

from app.cosmosdb import query_items_paginated, query_items, create_item, update_item, delete_item
from app.middleware.auth import RequireTroopContext, forbidden, get_troop_context
from app.middleware.moderation import moderate_text_fields, ModerationField
from app.middleware.roles import check_permission
from app.schemas import CreateMember, UpdateMember, UpdateTroopMemberStatus

logger = logging.getLogger(__name__)
router = APIRouter()

CONTAINER = "members"
FEEDBACK_CONTAINER = "feedback"
EVENTS_CONTAINER = "events"
DELETED_MEMBER_AUDIT = {"userId": "deleted-member", "displayName": "Deleted Member"}


def _is_associated_with_member(item: dict, member_id: str, user_id: str) -> bool:
    return item.get("memberId") == member_id or (
        len(user_id) > 0
        and (
            (item.get("createdBy") or {}).get("userId") == user_id
            or (item.get("updatedBy") or {}).get("userId") == user_id
        )
    )


def _should_anonymize_audit_field(item: dict, field: str, member_id: str, user_id: str) -> bool:
    return item.get("memberId") == member_id or (
        len(user_id) > 0 and (item.get(field) or {}).get("userId") == user_id
    )


def _to_first_name(display_name: str) -> str:
    return display_name.strip().split()[0] if display_name.strip() else ""


@router.get("/members")
async def list_members(
    auth: RequireTroopContext,
    limit: int = Query(default=50, ge=1, le=100),
    continuationToken: str | None = None,
):
    members, next_token = await query_items_paginated(
        CONTAINER,
        "SELECT * FROM c WHERE c.troopId = @troopId",
        [{"name": "@troopId", "value": auth.troopId}],
        limit=limit,
        continuation_token=continuationToken,
    )
    if not check_permission(auth.role, "manageMembers"):
        redacted_members = [
            {
                "id": member.get("id"),
                "displayName": member.get("displayName"),
                "role": member.get("role"),
                "status": member.get("status"),
            }
            for member in members
        ]
        return {"items": redacted_members, "continuationToken": next_token}
    return {"items": members, "continuationToken": next_token}


@router.post("/members", status_code=201)
async def create_member(body: CreateMember, auth: RequireTroopContext):
    if not check_permission(auth.role, "manageMembers"):
        forbidden()

    if body.role.value != "scout":
        existing = await query_items(
            CONTAINER,
            "SELECT * FROM c WHERE c.troopId = @troopId AND c.email = @email",
            [
                {"name": "@troopId", "value": auth.troopId},
                {"name": "@email", "value": body.email},
            ],
        )
        if existing:
            raise HTTPException(status_code=409, detail="Member with this email already exists")

    base = {
        "id": str(uuid.uuid4()),
        "troopId": auth.troopId,
        "status": "active",
    }
    display_name = _to_first_name(body.displayName) if body.role.value == "scout" else body.displayName
    moderation = await moderate_text_fields([ModerationField(field="displayName", text=display_name)])

    if body.role.value == "scout":
        member = await create_item(CONTAINER, {
            **base,
            "displayName": display_name,
            "role": body.role.value,
            "moderation": asdict(moderation),
        })
    else:
        member = await create_item(CONTAINER, {
            **base,
            "userId": "",
            "joinedAt": int(time.time() * 1000),
            "displayName": display_name,
            "email": body.email,
            "role": body.role.value,
            "moderation": asdict(moderation),
        })

    return member


@router.put("/members/{member_id}")
async def update_member(member_id: str, body: UpdateMember, auth: RequireTroopContext):
    if not check_permission(auth.role, "manageMembers"):
        forbidden()

    members = await query_items(
        CONTAINER,
        "SELECT * FROM c WHERE c.id = @id AND c.troopId = @troopId",
        [
            {"name": "@id", "value": member_id},
            {"name": "@troopId", "value": auth.troopId},
        ],
    )
    if not members:
        raise HTTPException(status_code=404, detail="Member not found")

    member = members[0]

    if member.get("role") == "troopAdmin" and body.role and body.role.value != "troopAdmin":
        admins = await query_items(
            CONTAINER,
            'SELECT * FROM c WHERE c.troopId = @troopId AND c.role = "troopAdmin"',
            [{"name": "@troopId", "value": auth.troopId}],
        )
        if len(admins) <= 1:
            raise HTTPException(status_code=400, detail="Cannot remove the last troop admin")

    updated = {
        **member,
        "role": body.role.value if body.role else member.get("role"),
        "status": body.status.value if body.status else member.get("status"),
    }

    result = await update_item(CONTAINER, member_id, updated, auth.troopId)
    return result


@router.delete("/members/{member_id}", status_code=204)
async def delete_member(member_id: str, auth: RequireTroopContext):
    if not check_permission(auth.role, "manageMembers"):
        forbidden()

    members = await query_items(
        CONTAINER,
        "SELECT * FROM c WHERE c.id = @id AND c.troopId = @troopId",
        [
            {"name": "@id", "value": member_id},
            {"name": "@troopId", "value": auth.troopId},
        ],
    )
    if not members:
        raise HTTPException(status_code=404, detail="Member not found")

    await delete_item(CONTAINER, member_id, auth.troopId)


@router.get("/members/me")
async def member_me(request: Request):
    auth = await get_troop_context(request)
    if not auth:
        raise HTTPException(status_code=404, detail="No troop membership found")
    return {"troopId": auth.troopId, "userId": auth.userId, "role": auth.role}


@router.delete("/members/{member_id}/data", status_code=204)
async def delete_member_data(member_id: str, auth: RequireTroopContext):
    if not check_permission(auth.role, "manageTroop"):
        forbidden()

    members = await query_items(
        CONTAINER,
        "SELECT * FROM c WHERE c.id = @id AND c.troopId = @troopId",
        [
            {"name": "@id", "value": member_id},
            {"name": "@troopId", "value": auth.troopId},
        ],
    )
    if not members:
        raise HTTPException(status_code=404, detail="Member not found")

    member = members[0]
    user_id = member.get("userId", "")
    has_user_id = len(user_id) > 0

    # Anonymize feedback
    if has_user_id:
        feedback_query = 'SELECT * FROM c WHERE c.troopId = @troopId AND (c.memberId = @memberId OR c.createdBy.userId = @userId OR c.updatedBy.userId = @userId)'
        feedback_params = [
            {"name": "@troopId", "value": auth.troopId},
            {"name": "@memberId", "value": member_id},
            {"name": "@userId", "value": user_id},
        ]
    else:
        feedback_query = "SELECT * FROM c WHERE c.troopId = @troopId AND c.memberId = @memberId"
        feedback_params = [
            {"name": "@troopId", "value": auth.troopId},
            {"name": "@memberId", "value": member_id},
        ]

    feedback_records = await query_items(FEEDBACK_CONTAINER, feedback_query, feedback_params)
    for fb in feedback_records:
        anonymized = {**fb}
        anonymized.pop("memberId", None)
        if _should_anonymize_audit_field(fb, "createdBy", member_id, user_id):
            anonymized["createdBy"] = DELETED_MEMBER_AUDIT
        if _should_anonymize_audit_field(fb, "updatedBy", member_id, user_id):
            anonymized["updatedBy"] = DELETED_MEMBER_AUDIT
        if _is_associated_with_member(fb, member_id, user_id):
            anonymized["scoutName"] = DELETED_MEMBER_AUDIT["displayName"]
        anonymized["updatedAt"] = int(time.time() * 1000)
        await update_item(FEEDBACK_CONTAINER, fb["id"], anonymized, auth.troopId)

    # Anonymize events
    if has_user_id:
        event_query = 'SELECT * FROM c WHERE c.troopId = @troopId AND (c.memberId = @memberId OR c.createdBy.userId = @userId OR c.updatedBy.userId = @userId)'
        event_params = [
            {"name": "@troopId", "value": auth.troopId},
            {"name": "@memberId", "value": member_id},
            {"name": "@userId", "value": user_id},
        ]
    else:
        event_query = "SELECT * FROM c WHERE c.troopId = @troopId AND c.memberId = @memberId"
        event_params = [
            {"name": "@troopId", "value": auth.troopId},
            {"name": "@memberId", "value": member_id},
        ]

    events = await query_items(EVENTS_CONTAINER, event_query, event_params)
    for evt in events:
        anonymized = {**evt}
        anonymized.pop("memberId", None)
        if _should_anonymize_audit_field(evt, "createdBy", member_id, user_id):
            anonymized["createdBy"] = DELETED_MEMBER_AUDIT
        if _should_anonymize_audit_field(evt, "updatedBy", member_id, user_id):
            anonymized["updatedBy"] = DELETED_MEMBER_AUDIT
        anonymized["updatedAt"] = int(time.time() * 1000)
        await update_item(EVENTS_CONTAINER, evt["id"], anonymized, auth.troopId)

    await delete_item(CONTAINER, member_id, auth.troopId)


@router.patch("/troops/{troop_id}/members/{member_id}")
async def update_troop_member_status(troop_id: str, member_id: str, body: UpdateTroopMemberStatus, auth: RequireTroopContext):
    if auth.role != "troopAdmin":
        forbidden()
    if troop_id != auth.troopId:
        forbidden()

    members = await query_items(
        CONTAINER,
        "SELECT * FROM c WHERE c.id = @id AND c.troopId = @troopId",
        [
            {"name": "@id", "value": member_id},
            {"name": "@troopId", "value": troop_id},
        ],
    )
    if not members:
        raise HTTPException(status_code=404, detail="Member not found")

    member = members[0]

    if member.get("role") == "troopAdmin" and member.get("status") == "active":
        admins = await query_items(
            CONTAINER,
            'SELECT * FROM c WHERE c.troopId = @troopId AND c.role = "troopAdmin" AND c.status = "active"',
            [{"name": "@troopId", "value": troop_id}],
        )
        if len(admins) <= 1:
            raise HTTPException(status_code=400, detail="Cannot remove the last troop admin")

    updated = {**member, "status": body.status.value}
    result = await update_item(CONTAINER, member_id, updated, troop_id)
    return result
