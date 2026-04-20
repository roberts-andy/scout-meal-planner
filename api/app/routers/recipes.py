from __future__ import annotations

import logging
import time
import uuid

from fastapi import APIRouter

from app.cosmosdb import get_all_by_troop, get_by_id, create_item, update_item, delete_item
from app.middleware.auth import RequireTroopContext, forbidden
from app.middleware.roles import check_permission
from app.middleware.moderation import moderate_text_fields, can_view_moderated_content, ModerationField
from app.schemas import CreateRecipe, UpdateRecipe

logger = logging.getLogger(__name__)
router = APIRouter()

CONTAINER = "recipes"


def _recipe_moderation_fields(data: CreateRecipe | UpdateRecipe) -> list[ModerationField]:
    fields: list[ModerationField] = [ModerationField(field="name", text=data.name)]
    for i, variation in enumerate(data.variations):
        for j, instruction in enumerate(variation.instructions):
            fields.append(ModerationField(field=f"variations[{i}].instructions[{j}]", text=instruction))
    return fields


@router.get("/recipes")
async def list_recipes(auth: RequireTroopContext):
    recipes = await get_all_by_troop(CONTAINER, auth.troopId)
    return [r for r in recipes if can_view_moderated_content(auth.role, r.get("moderation"))]


@router.get("/recipes/{recipe_id}")
async def get_recipe(recipe_id: str, auth: RequireTroopContext):
    recipe = await get_by_id(CONTAINER, recipe_id, auth.troopId)
    if not recipe:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Recipe not found")
    if not can_view_moderated_content(auth.role, recipe.get("moderation")):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe


@router.post("/recipes", status_code=201)
async def create_recipe(body: CreateRecipe, auth: RequireTroopContext):
    if not check_permission(auth.role, "manageRecipes"):
        forbidden()
    now = int(time.time() * 1000)
    audit = {"userId": auth.userId, "displayName": auth.displayName}
    moderation = await moderate_text_fields(_recipe_moderation_fields(body))
    recipe = await create_item(CONTAINER, {
        "id": str(uuid.uuid4()),
        "troopId": auth.troopId,
        **body.model_dump(),
        "moderation": moderation.__dict__,
        "createdAt": now,
        "updatedAt": now,
        "createdBy": audit,
        "updatedBy": audit,
    })
    return recipe


@router.put("/recipes/{recipe_id}")
async def update_recipe(recipe_id: str, body: UpdateRecipe, auth: RequireTroopContext):
    if not check_permission(auth.role, "manageRecipes"):
        forbidden()
    existing = await get_by_id(CONTAINER, recipe_id, auth.troopId)
    if not existing:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Recipe not found")
    moderation = await moderate_text_fields(_recipe_moderation_fields(body))
    recipe = await update_item(CONTAINER, recipe_id, {
        **existing,
        **body.model_dump(),
        "id": recipe_id,
        "troopId": auth.troopId,
        "moderation": moderation.__dict__,
        "updatedAt": int(time.time() * 1000),
        "updatedBy": {"userId": auth.userId, "displayName": auth.displayName},
    }, auth.troopId)
    return recipe


@router.delete("/recipes/{recipe_id}", status_code=204)
async def delete_recipe(recipe_id: str, auth: RequireTroopContext):
    if not check_permission(auth.role, "manageRecipes"):
        forbidden()
    await delete_item(CONTAINER, recipe_id, auth.troopId)
