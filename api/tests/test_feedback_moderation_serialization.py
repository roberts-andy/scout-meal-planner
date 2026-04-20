from types import SimpleNamespace

import pytest

from app.middleware.moderation import ModerationResult
from app.routers import feedback as feedback_router
from app.schemas import CreateFeedback


def _make_feedback_body() -> CreateFeedback:
    return CreateFeedback(
        eventId="event-1",
        mealId="meal-1",
        recipeId="recipe-1",
        rating={"taste": 5, "difficulty": 3, "portionSize": 4},
        comments="Great",
        whatWorked="Prep",
        whatToChange="Sauce",
    )


def _make_auth():
    return SimpleNamespace(
        userId="user-1",
        displayName="Scout User",
        troopId="troop-1",
        role="scout",
    )


@pytest.mark.asyncio
async def test_create_feedback_serializes_moderation_with_asdict(monkeypatch):
    captured = {}

    async def fake_moderate_text_fields(_fields):
        moderation = ModerationResult(status="approved", flaggedFields=[], checkedAt=123)
        moderation.internal = "do-not-store"
        return moderation

    async def fake_create_item(_container, item):
        captured["item"] = item
        return item

    monkeypatch.setattr(feedback_router, "check_permission", lambda _role, _perm: True)
    monkeypatch.setattr(feedback_router, "moderate_text_fields", fake_moderate_text_fields)
    monkeypatch.setattr(feedback_router, "create_item", fake_create_item)

    await feedback_router.create_feedback(_make_feedback_body(), _make_auth())

    assert captured["item"]["moderation"] == {
        "status": "approved",
        "flaggedFields": [],
        "checkedAt": 123,
        "provider": "azure-content-safety",
    }
    assert "internal" not in captured["item"]["moderation"]


@pytest.mark.asyncio
async def test_update_feedback_serializes_moderation_with_asdict(monkeypatch):
    captured = {}
    existing = {"id": "feedback-1", "troopId": "troop-1", "eventId": "event-1", "recipeId": "recipe-1"}

    async def fake_moderate_text_fields(_fields):
        moderation = ModerationResult(status="flagged", flaggedFields=["comments"], checkedAt=456)
        moderation.internal = "do-not-store"
        return moderation

    async def fake_get_by_id(_container, _feedback_id, _troop_id):
        return existing

    async def fake_update_item(_container, _feedback_id, item, _troop_id):
        captured["item"] = item
        return item

    monkeypatch.setattr(feedback_router, "check_permission", lambda _role, _perm: True)
    monkeypatch.setattr(feedback_router, "moderate_text_fields", fake_moderate_text_fields)
    monkeypatch.setattr(feedback_router, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(feedback_router, "update_item", fake_update_item)

    await feedback_router.update_feedback("feedback-1", _make_feedback_body(), _make_auth())

    assert captured["item"]["moderation"] == {
        "status": "flagged",
        "flaggedFields": ["comments"],
        "checkedAt": 456,
        "provider": "azure-content-safety",
    }
    assert "internal" not in captured["item"]["moderation"]
