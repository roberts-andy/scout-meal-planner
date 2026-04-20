from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.middleware import moderation
from app.middleware.auth import TroopContext
from app.routers import email_shopping_list, feedback, share
from app.schemas import CreateFeedback, EmailShoppingList


def _make_feedback_body() -> CreateFeedback:
    return CreateFeedback(
        eventId="event-1",
        mealId="meal-1",
        recipeId="recipe-1",
        rating={"taste": 5, "difficulty": 4, "portionSize": 4},
        comments="Great trip",
        whatWorked="Prep work",
        whatToChange="Add spice",
    )


@pytest.mark.asyncio
async def test_moderation_returns_approved_when_flag_disabled(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("FEATURE_FLAG_ENABLE_CONTENT_MODERATION", "false")

    async def fake_analyze_text(_text: str):
        raise AssertionError("_analyze_text should not be called when moderation is disabled")

    monkeypatch.setattr(moderation, "_analyze_text", fake_analyze_text)

    result = await moderation.moderate_text_fields([moderation.ModerationField(field="comments", text="text")])

    assert result.status == "approved"
    assert result.provider == "disabled"


@pytest.mark.asyncio
async def test_share_endpoints_reject_when_flag_disabled(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("FEATURE_FLAG_ENABLE_SHARED_LINKS", "false")

    auth = TroopContext(
        userId="user-1",
        email="leader@example.com",
        displayName="Leader",
        troopId="troop-1",
        role="troopAdmin",
    )

    with pytest.raises(HTTPException) as exc:
        await share.get_event_share("event-1", RequestFactory.make(), auth)

    assert exc.value.status_code == 503
    assert exc.value.detail == "Shared links feature is disabled"


@pytest.mark.asyncio
async def test_email_endpoint_rejects_when_flag_disabled(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("FEATURE_FLAG_ENABLE_EMAIL_SHOPPING_LIST", "false")

    called = False

    async def fake_get_by_id(*_args, **_kwargs):
        nonlocal called
        called = True
        return None

    monkeypatch.setattr(email_shopping_list, "get_by_id", fake_get_by_id)

    with pytest.raises(HTTPException) as exc:
        await email_shopping_list.email_shopping_list(
            "event-1",
            EmailShoppingList(
                recipientEmail="parent@example.com",
                items=[{"name": "Beans", "quantity": 1, "unit": "can"}],
            ),
            SimpleNamespace(role="scout", troopId="troop-1"),
        )

    assert exc.value.status_code == 503
    assert exc.value.detail == "Shopping list email feature is disabled"
    assert called is False


@pytest.mark.asyncio
async def test_feedback_endpoints_reject_when_flag_disabled(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("FEATURE_FLAG_ENABLE_FEEDBACK", "false")

    async def fake_moderate(*_args, **_kwargs):
        raise AssertionError("moderate_text_fields should not be called when feedback is disabled")

    monkeypatch.setattr(feedback, "moderate_text_fields", fake_moderate)

    with pytest.raises(HTTPException) as exc:
        await feedback.create_feedback(
            _make_feedback_body(),
            SimpleNamespace(
                role="scout",
                troopId="troop-1",
                userId="user-1",
                displayName="Scout",
            ),
        )

    assert exc.value.status_code == 503
    assert exc.value.detail == "Feedback feature is disabled"


class RequestFactory:
    @staticmethod
    def make():
        from starlette.requests import Request

        path = "/api/events/event-1/share"
        return Request(
            {
                "type": "http",
                "http_version": "1.1",
                "method": "GET",
                "scheme": "https",
                "path": path,
                "raw_path": path.encode(),
                "query_string": b"",
                "headers": [],
                "client": ("testclient", 123),
                "server": ("example.com", 443),
                "root_path": "",
            }
        )
