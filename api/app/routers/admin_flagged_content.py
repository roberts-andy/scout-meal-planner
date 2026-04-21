from __future__ import annotations

import logging
import re
import time
from typing import Literal

from fastapi import APIRouter, HTTPException

from app.cosmosdb import get_all_by_troop, get_by_id, update_item
from app.middleware.auth import RequireTroopContext, forbidden
from app.middleware.roles import check_permission
from app.schemas import ReviewFlaggedContent, ReviewFlaggedContentEdit

logger = logging.getLogger(__name__)
router = APIRouter()

RECIPES_CONTAINER = "recipes"
FEEDBACK_CONTAINER = "feedback"

ContentType = Literal["recipe", "feedback"]


def _format_categories(categories: list[dict]) -> str:
    parts: list[str] = []
    for category in categories:
        name = category.get("category")
        severity = category.get("severity")
        if isinstance(name, str) and isinstance(severity, (int, float)):
            parts.append(f"{name} severity {int(severity)}/6")
    return ", ".join(parts)


def _format_flag_reason(item: dict) -> str:
    moderation = item.get("moderation") or {}
    fields = moderation.get("flaggedFields", [])
    field_categories = moderation.get("fieldCategories", [])

    if isinstance(fields, list) and fields:
        if isinstance(field_categories, list) and field_categories:
            category_lookup: dict[str, list[dict]] = {}
            for entry in field_categories:
                if not isinstance(entry, dict):
                    continue
                field = entry.get("field")
                categories = entry.get("categories")
                if isinstance(field, str) and isinstance(categories, list):
                    category_lookup[field] = categories

            formatted_fields = []
            for field in fields:
                if not isinstance(field, str):
                    continue
                details = _format_categories(category_lookup.get(field, []))
                formatted_fields.append(f"{field} ({details})" if details else field)
            if formatted_fields:
                return f"Flagged fields: {', '.join(formatted_fields)}"
        return f"Flagged fields: {', '.join(fields)}"

    categories = moderation.get("categories", [])
    if isinstance(categories, list):
        details = _format_categories(categories)
        if details:
            return f"Flagged by moderation system: {details}"
    return "Flagged by moderation system"


def _extract_field_value(item: dict, field_path: str):
    """Resolve dotted/indexed field paths like 'variations[0].instructions[1]' from item."""
    current: object = item
    for key, index in re.findall(r"([^\.\[\]]+)|\[(\d+)\]", field_path):
        if key:
            if not isinstance(current, dict):
                return None
            current = current.get(key)
            continue

        if index:
            if not isinstance(current, list):
                return None
            idx = int(index)
            if idx < 0 or idx >= len(current):
                return None
            current = current[idx]

    return current


def _build_flagged_details(item: dict, moderation: dict, context: dict) -> list[dict]:
    fields = moderation.get("flaggedFields", [])
    if not isinstance(fields, list) or not fields:
        return []

    categories_lookup: dict[str, list[dict]] = {}
    for entry in moderation.get("fieldCategories", []):
        if not isinstance(entry, dict):
            continue
        field = entry.get("field")
        categories = entry.get("categories")
        if isinstance(field, str) and isinstance(categories, list):
            categories_lookup[field] = categories

    details: list[dict] = []
    for field in fields:
        if not isinstance(field, str):
            continue
        raw_value = _extract_field_value(item, field)
        if raw_value is None:
            raw_value = context.get(field)

        if isinstance(raw_value, str):
            text: str | None = raw_value
        elif raw_value is not None:
            text = str(raw_value)
        else:
            text = None

        details.append({
            "field": field,
            "text": text,
            "categories": categories_lookup.get(field, []),
        })
    return details


def _to_flagged_list_item(content_type: ContentType, item: dict) -> dict:
    moderation = item.get("moderation") or {}
    context: dict
    if content_type == "recipe":
        context = {
            "name": item.get("name", ""),
            "description": item.get("description", ""),
            "servings": item.get("servings"),
        }
    else:
        context = {
            "eventId": item.get("eventId"),
            "recipeId": item.get("recipeId"),
            "comments": item.get("comments", ""),
            "whatWorked": item.get("whatWorked", ""),
            "whatToChange": item.get("whatToChange", ""),
            "rating": item.get("rating"),
        }

    return {
        "id": f"{content_type}:{item['id']}",
        "contentId": item["id"],
        "contentType": content_type,
        "flagReason": _format_flag_reason(item),
        "flaggedAt": moderation.get("checkedAt") or item.get("updatedAt") or item.get("createdAt") or int(time.time() * 1000),
        "moderation": moderation,
        "flaggedDetails": _build_flagged_details(item, moderation, context),
        "context": context,
    }


def _parse_review_target(id_param: str) -> tuple[ContentType, str] | None:
    parts = id_param.split(":", 1)
    if len(parts) == 2 and parts[0] in ("recipe", "feedback"):
        return parts[0], parts[1]  # type: ignore[return-value]
    return None


async def _resolve_item(id_param: str, troop_id: str) -> dict | None:
    typed = _parse_review_target(id_param)
    if typed:
        content_type, content_id = typed
        container = RECIPES_CONTAINER if content_type == "recipe" else FEEDBACK_CONTAINER
        item = await get_by_id(container, content_id, troop_id)
        if not item:
            return None
        return {"status": "ok", "contentType": content_type, "item": item}

    recipe = await get_by_id(RECIPES_CONTAINER, id_param, troop_id)
    feedback = await get_by_id(FEEDBACK_CONTAINER, id_param, troop_id)
    if recipe and feedback:
        return {"status": "ambiguous"}
    if recipe:
        return {"status": "ok", "contentType": "recipe", "item": recipe}
    if feedback:
        return {"status": "ok", "contentType": "feedback", "item": feedback}
    return None


@router.get("/admin/flagged-content")
async def list_flagged_content(auth: RequireTroopContext):
    if not check_permission(auth.role, "manageTroop"):
        forbidden()

    recipes, feedback = await get_all_by_troop(RECIPES_CONTAINER, auth.troopId), await get_all_by_troop(FEEDBACK_CONTAINER, auth.troopId)

    reviewable_statuses = {"flagged", "pending"}
    flagged = [
        *[_to_flagged_list_item("recipe", r) for r in recipes if (r.get("moderation") or {}).get("status") in reviewable_statuses],
        *[_to_flagged_list_item("feedback", f) for f in feedback if (f.get("moderation") or {}).get("status") in reviewable_statuses],
    ]
    flagged.sort(key=lambda x: x["flaggedAt"], reverse=True)

    return flagged


@router.put("/admin/flagged-content/{item_id}")
async def review_flagged_content(item_id: str, body: ReviewFlaggedContent, auth: RequireTroopContext):
    if not check_permission(auth.role, "manageTroop"):
        forbidden()

    resolved = await _resolve_item(item_id, auth.troopId)
    if not resolved:
        raise HTTPException(status_code=404, detail="Flagged content not found")
    if resolved.get("status") == "ambiguous":
        raise HTTPException(status_code=409, detail="Ambiguous content id. Use contentType:id format.")

    content_type: ContentType = resolved["contentType"]
    item = resolved["item"]
    now = int(time.time() * 1000)
    audit = {"userId": auth.userId, "displayName": auth.displayName}
    container = RECIPES_CONTAINER if content_type == "recipe" else FEEDBACK_CONTAINER

    moderation = {
        **(item.get("moderation") or {}),
        "checkedAt": now,
        "reviewedAt": now,
        "reviewedBy": audit,
        "reviewAction": body.action,
    }

    if body.action == "reject":
        moderation["status"] = "rejected"
    else:
        moderation["status"] = "approved"
        moderation["flaggedFields"] = []

    updated = {
        **item,
        "id": item["id"],
        "troopId": auth.troopId,
        "moderation": moderation,
        "updatedAt": now,
        "updatedBy": audit,
    }

    if body.action == "edit" and isinstance(body, ReviewFlaggedContentEdit):
        edits = body.edits
        if content_type == "recipe":
            if edits.name is not None:
                updated["name"] = edits.name
            if edits.description is not None:
                updated["description"] = edits.description
        else:
            if edits.comments is not None:
                updated["comments"] = edits.comments
            if edits.whatWorked is not None:
                updated["whatWorked"] = edits.whatWorked
            if edits.whatToChange is not None:
                updated["whatToChange"] = edits.whatToChange

    result = await update_item(container, item["id"], updated, auth.troopId)
    return {
        "id": f"{content_type}:{result['id']}",
        "contentId": result["id"],
        "contentType": content_type,
        "action": body.action,
        "moderation": result.get("moderation"),
    }
