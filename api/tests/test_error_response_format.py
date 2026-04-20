from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.routers import event_packed, event_purchased, events, feedback, members, recipes, troops
from app.schemas import (
    TogglePackedItem,
    TogglePurchasedItem,
    UpdateEvent,
    UpdateFeedback,
    UpdateRecipe,
    UpdateTroop,
    JoinTroop,
)


def _auth(role: str = "troopAdmin") -> SimpleNamespace:
    return SimpleNamespace(
        troopId="troop-1",
        userId="user-1",
        displayName="Test User",
        role=role,
    )


def _claims() -> SimpleNamespace:
    return SimpleNamespace(
        userId="user-1",
        email="user@example.com",
        displayName="Test User",
    )


def _update_event_body() -> UpdateEvent:
    return UpdateEvent(
        name="Campout",
        startDate="2026-01-01",
        endDate="2026-01-02",
        days=[],
    )


def _update_feedback_body() -> UpdateFeedback:
    return UpdateFeedback(
        eventId="event-1",
        mealId="meal-1",
        recipeId="recipe-1",
        rating={"taste": 4, "difficulty": 3, "portionSize": 5},
        comments="Good",
        whatWorked="Flavor",
        whatToChange="Less salt",
    )


def _update_recipe_body() -> UpdateRecipe:
    return UpdateRecipe(
        name="Recipe",
        servings=4,
        ingredients=[],
        variations=[],
    )


@pytest.mark.asyncio
async def test_event_router_not_found_uses_http_exception(monkeypatch):
    async def _missing(*_args, **_kwargs):
        return None

    monkeypatch.setattr(events, "get_by_id", _missing)

    with pytest.raises(HTTPException) as exc:
        await events.get_event("event-1", _auth())
    assert exc.value.status_code == 404
    assert exc.value.detail == "Event not found"

    with pytest.raises(HTTPException) as exc:
        await events.update_event("event-1", _update_event_body(), _auth())
    assert exc.value.status_code == 404
    assert exc.value.detail == "Event not found"


@pytest.mark.asyncio
async def test_event_toggle_routers_not_found_use_http_exception(monkeypatch):
    async def _missing(*_args, **_kwargs):
        return None

    monkeypatch.setattr(event_packed, "get_by_id", _missing)
    monkeypatch.setattr(event_purchased, "get_by_id", _missing)

    with pytest.raises(HTTPException) as exc:
        await event_packed.toggle_packed("event-1", TogglePackedItem(item="Skillet", packed=True), _auth())
    assert exc.value.status_code == 404
    assert exc.value.detail == "Event not found"

    with pytest.raises(HTTPException) as exc:
        await event_purchased.toggle_purchased("event-1", TogglePurchasedItem(item="Beans", purchased=True), _auth())
    assert exc.value.status_code == 404
    assert exc.value.detail == "Event not found"


@pytest.mark.asyncio
async def test_feedback_router_not_found_uses_http_exception(monkeypatch):
    async def _missing(*_args, **_kwargs):
        return None

    monkeypatch.setattr(feedback, "get_by_id", _missing)

    with pytest.raises(HTTPException) as exc:
        await feedback.update_feedback("feedback-1", _update_feedback_body(), _auth(role="scout"))
    assert exc.value.status_code == 404
    assert exc.value.detail == "Feedback not found"


@pytest.mark.asyncio
async def test_members_me_without_context_uses_http_exception(monkeypatch):
    async def _no_context(*_args, **_kwargs):
        return None

    monkeypatch.setattr(members, "get_troop_context", _no_context)

    with pytest.raises(HTTPException) as exc:
        await members.member_me(object())
    assert exc.value.status_code == 404
    assert exc.value.detail == "No troop membership found"


@pytest.mark.asyncio
async def test_recipe_router_not_found_and_hidden_use_http_exception(monkeypatch):
    async def _missing(*_args, **_kwargs):
        return None

    monkeypatch.setattr(recipes, "get_by_id", _missing)
    with pytest.raises(HTTPException) as exc:
        await recipes.get_recipe("recipe-1", _auth(role="scout"))
    assert exc.value.status_code == 404
    assert exc.value.detail == "Recipe not found"

    with pytest.raises(HTTPException) as exc:
        await recipes.update_recipe("recipe-1", _update_recipe_body(), _auth())
    assert exc.value.status_code == 404
    assert exc.value.detail == "Recipe not found"

    async def _present(*_args, **_kwargs):
        return {"id": "recipe-1", "troopId": "troop-1", "moderation": {"status": "pending"}}

    monkeypatch.setattr(recipes, "get_by_id", _present)
    monkeypatch.setattr(recipes, "can_view_moderated_content", lambda *_args, **_kwargs: False)
    with pytest.raises(HTTPException) as exc:
        await recipes.get_recipe("recipe-1", _auth(role="scout"))
    assert exc.value.status_code == 404
    assert exc.value.detail == "Recipe not found"


@pytest.mark.asyncio
async def test_troop_router_errors_use_http_exception(monkeypatch):
    async def _missing(*_args, **_kwargs):
        return None

    monkeypatch.setattr(troops, "get_by_id", _missing)

    with pytest.raises(HTTPException) as exc:
        await troops.get_troop(_auth())
    assert exc.value.status_code == 404
    assert exc.value.detail == "Troop not found"

    with pytest.raises(HTTPException) as exc:
        await troops.update_troop(UpdateTroop(name="Updated Troop"), _auth())
    assert exc.value.status_code == 404
    assert exc.value.detail == "Troop not found"

    monkeypatch.setattr(troops, "query_items", _missing)
    with pytest.raises(HTTPException) as exc:
        await troops.join_troop(JoinTroop(inviteCode="BAD"), _claims())
    assert exc.value.status_code == 404
    assert exc.value.detail == "Invalid invite code"

    async def _troop_then_existing(*_args, **_kwargs):
        return [{"id": "troop-1"}]

    monkeypatch.setattr(troops, "query_items", _troop_then_existing)
    with pytest.raises(HTTPException) as exc:
        await troops.join_troop(JoinTroop(inviteCode="GOOD"), _claims())
    assert exc.value.status_code == 409
    assert exc.value.detail == "Already a member of this troop"
