from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.middleware.auth import TroopContext
from app.middleware.moderation import ModerationResult
from app.routers import feedback as feedback_router
from app.schemas import UpdateFeedback


def _build_update_feedback_body() -> UpdateFeedback:
    return UpdateFeedback(
        eventId="event-1",
        mealId="meal-1",
        recipeId="recipe-1",
        scoutName="Scout One",
        rating={"taste": 4, "difficulty": 3, "portionSize": 5},
        comments="Updated comments",
        whatWorked="Updated what worked",
        whatToChange="Updated what to change",
        photos=[],
    )


@pytest.mark.asyncio
async def test_scout_cannot_update_other_scout_feedback(monkeypatch: pytest.MonkeyPatch):
    existing_feedback = {
        "id": "feedback-1",
        "troopId": "troop-1",
        "createdBy": {"userId": "scout-author", "displayName": "Scout Author"},
    }

    async def fake_get_by_id(*_args, **_kwargs):
        return existing_feedback

    async def fake_moderate_text_fields(*_args, **_kwargs):
        raise AssertionError("moderate_text_fields should not be called for unauthorized update")

    async def fake_update_item(*_args, **_kwargs):
        raise AssertionError("update_item should not be called for unauthorized update")

    monkeypatch.setattr(feedback_router, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(feedback_router, "moderate_text_fields", fake_moderate_text_fields)
    monkeypatch.setattr(feedback_router, "update_item", fake_update_item)

    auth = TroopContext(
        userId="scout-editor",
        email="scout@example.com",
        displayName="Scout Editor",
        troopId="troop-1",
        role="scout",
    )

    with pytest.raises(HTTPException) as exc_info:
        await feedback_router.update_feedback("feedback-1", _build_update_feedback_body(), auth)

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "You can only edit your own feedback"


@pytest.mark.asyncio
async def test_leader_can_update_any_feedback(monkeypatch: pytest.MonkeyPatch):
    existing_feedback = {
        "id": "feedback-1",
        "troopId": "troop-1",
        "createdBy": {"userId": "scout-author", "displayName": "Scout Author"},
        "createdAt": 1,
    }
    updated_payload: dict = {}

    async def fake_get_by_id(*_args, **_kwargs):
        return existing_feedback

    async def fake_moderate_text_fields(*_args, **_kwargs):
        return ModerationResult(status="approved", checkedAt=123)

    async def fake_update_item(_container, _id, payload, _partition_key):
        updated_payload.update(payload)
        return payload

    monkeypatch.setattr(feedback_router, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(feedback_router, "moderate_text_fields", fake_moderate_text_fields)
    monkeypatch.setattr(feedback_router, "update_item", fake_update_item)

    auth = TroopContext(
        userId="leader-1",
        email="leader@example.com",
        displayName="Adult Leader",
        troopId="troop-1",
        role="adultLeader",
    )

    result = await feedback_router.update_feedback("feedback-1", _build_update_feedback_body(), auth)

    assert result["id"] == "feedback-1"
    assert updated_payload["createdBy"]["userId"] == "scout-author"
    assert updated_payload["updatedBy"]["userId"] == "leader-1"
    assert updated_payload["troopId"] == "troop-1"
