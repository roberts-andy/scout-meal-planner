from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, HTTPException
from fastapi import Query

from app.audit import audit_create, audit_update
from app.cosmosdb import create_item, delete_item, get_all_by_troop, get_by_id, query_items_paginated, update_item
from app.middleware.auth import RequireTroopContext, forbidden
from app.middleware.roles import check_permission
from app.middleware.moderation import moderate_text_fields, can_view_moderated_content, ModerationField
from app.schemas import CreateRecipe, UpdateRecipe
from app.telemetry import track_custom_event

logger = logging.getLogger(__name__)
router = APIRouter()

CONTAINER = "recipes"


def _recipe_moderation_fields(data: CreateRecipe | UpdateRecipe) -> list[ModerationField]:
    fields: list[ModerationField] = []
    if data.name is not None:
        fields.append(ModerationField(field="name", text=data.name))
    for i, variation in enumerate(data.variations or []):
        for j, instruction in enumerate(variation.instructions):
            fields.append(ModerationField(field=f"variations[{i}].instructions[{j}]", text=instruction))
    return fields


@router.get("/recipes")
async def list_recipes(
    auth: RequireTroopContext,
    limit: int = Query(default=50, ge=1, le=100),
    continuationToken: str | None = None,
):
    query = "SELECT * FROM c WHERE c.troopId = @troopId"
    if auth.role != "troopAdmin":
        query += ' AND (NOT IS_DEFINED(c.moderation.status) OR c.moderation.status = "approved")'

    recipes, next_token = await query_items_paginated(
        CONTAINER,
        query,
        [{"name": "@troopId", "value": auth.troopId}],
        limit=limit,
        continuation_token=continuationToken,
    )
    return {"items": recipes, "continuationToken": next_token}


@router.get("/recipes/{recipe_id}")
async def get_recipe(recipe_id: str, auth: RequireTroopContext):
    recipe = await get_by_id(CONTAINER, recipe_id, auth.troopId)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    if not can_view_moderated_content(auth.role, recipe.get("moderation")):
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe


@router.post("/recipes", status_code=201)
async def create_recipe(body: CreateRecipe, auth: RequireTroopContext):
    if not check_permission(auth.role, "manageRecipes"):
        forbidden()
    moderation = await moderate_text_fields(_recipe_moderation_fields(body))
    recipe = await create_item(CONTAINER, {
        "id": str(uuid.uuid4()),
        "troopId": auth.troopId,
        **body.model_dump(),
        "moderation": moderation.__dict__,
        **audit_create(auth),
    })
    if moderation.status == "flagged":
        track_custom_event("content_flagged", properties={
            "contentType": "recipe",
            "contentId": recipe["id"],
            "troopId": auth.troopId,
        })
    return recipe


@router.put("/recipes/{recipe_id}")
async def update_recipe(recipe_id: str, body: UpdateRecipe, auth: RequireTroopContext):
    if not check_permission(auth.role, "manageRecipes"):
        forbidden()
    existing = await get_by_id(CONTAINER, recipe_id, auth.troopId)
    if not existing:
        raise HTTPException(status_code=404, detail="Recipe not found")
    moderation = await moderate_text_fields(_recipe_moderation_fields(body))
    recipe = await update_item(CONTAINER, recipe_id, {
        **existing,
        **body.model_dump(exclude_unset=True),
        "id": recipe_id,
        "troopId": auth.troopId,
        "moderation": moderation.__dict__,
        **audit_update(auth),
    }, auth.troopId)
    if moderation.status == "flagged":
        track_custom_event("content_flagged", properties={
            "contentType": "recipe",
            "contentId": recipe_id,
            "troopId": auth.troopId,
        })
    return recipe


@router.delete("/recipes/{recipe_id}", status_code=204)
async def delete_recipe(recipe_id: str, auth: RequireTroopContext):
    if not check_permission(auth.role, "manageRecipes"):
        forbidden()
    await delete_item(CONTAINER, recipe_id, auth.troopId)
