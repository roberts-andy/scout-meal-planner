from __future__ import annotations

import pytest
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.middleware.auth import TroopContext, require_troop_context
from app.middleware.moderation import ModerationResult
from app.routers import feedback as feedback_router
from app.schemas import UpdateFeedback


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    yield
    app.dependency_overrides.clear()


def _set_auth_override(role: str, user_id: str):
    async def _override():
        return TroopContext(
            userId=user_id,
            email=f"{user_id}@example.com",
            displayName=user_id,
            troopId="troop-1",
            role=role,
        )

    app.dependency_overrides[require_troop_context] = _override


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
async def test_scout_can_delete_own_feedback(client, monkeypatch):
    _set_auth_override("scout", "scout-1")

    async def fake_get_by_id(container: str, item_id: str, troop_id: str):
        return {"id": item_id, "troopId": troop_id, "createdBy": {"userId": "scout-1"}}

    calls: list[tuple[str, str, str]] = []

    async def fake_delete_item(container: str, item_id: str, troop_id: str):
        calls.append((container, item_id, troop_id))

    monkeypatch.setattr(feedback_router, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(feedback_router, "delete_item", fake_delete_item)

    response = await client.delete("/api/feedback/fb-1")

    assert response.status_code == 204
    assert calls == [("feedback", "fb-1", "troop-1")]


@pytest.mark.asyncio
async def test_scout_cannot_delete_another_scout_feedback(client, monkeypatch):
    _set_auth_override("scout", "scout-1")

    async def fake_get_by_id(container: str, item_id: str, troop_id: str):
        return {"id": item_id, "troopId": troop_id, "createdBy": {"userId": "scout-2"}}

    delete_called = False

    async def fake_delete_item(container: str, item_id: str, troop_id: str):
        nonlocal delete_called
        delete_called = True

    monkeypatch.setattr(feedback_router, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(feedback_router, "delete_item", fake_delete_item)

    response = await client.delete("/api/feedback/fb-1")

    assert response.status_code == 403
    assert response.json() == {"detail": "You can only delete your own feedback"}
    assert delete_called is False


@pytest.mark.asyncio
async def test_leader_can_delete_any_feedback(client, monkeypatch):
    _set_auth_override("adultLeader", "leader-1")

    async def fake_get_by_id(container: str, item_id: str, troop_id: str):
        return {"id": item_id, "troopId": troop_id, "createdBy": {"userId": "scout-2"}}

    calls: list[tuple[str, str, str]] = []

    async def fake_delete_item(container: str, item_id: str, troop_id: str):
        calls.append((container, item_id, troop_id))

    monkeypatch.setattr(feedback_router, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(feedback_router, "delete_item", fake_delete_item)

    response = await client.delete("/api/feedback/fb-1")

    assert response.status_code == 204
    assert calls == [("feedback", "fb-1", "troop-1")]


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
