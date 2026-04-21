from __future__ import annotations

from types import SimpleNamespace

import pytest
import pytest_asyncio
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.feature_flags import init_app_config, _resolve_from_app_config, is_feature_enabled
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


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as async_client:
        yield async_client


@pytest.mark.asyncio
async def test_get_feature_flags_returns_evaluated_backend_flags(client, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("FEATURE_FLAGS_ENV", "dev")
    monkeypatch.setenv("FEATURE_FLAG_ENABLE_SHARED_LINKS", "true")
    monkeypatch.setenv("FEATURE_FLAG_ENABLE_PRINT_RECIPES", "false")

    response = await client.get("/api/feature-flags")

    assert response.status_code == 200
    assert response.json() == {
        "enable-content-moderation": False,
        "enable-email-shopping-list": False,
        "enable-shared-links": True,
        "enable-feedback": True,
        "enable-print-recipes": False,
    }


@pytest.mark.asyncio
async def test_get_feature_flags_returns_defaults_without_overrides(client, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("FEATURE_FLAGS_ENV", "dev")
    monkeypatch.delenv("FEATURE_FLAG_ENABLE_CONTENT_MODERATION", raising=False)
    monkeypatch.delenv("FEATURE_FLAG_ENABLE_EMAIL_SHOPPING_LIST", raising=False)
    monkeypatch.delenv("FEATURE_FLAG_ENABLE_SHARED_LINKS", raising=False)
    monkeypatch.delenv("FEATURE_FLAG_ENABLE_FEEDBACK", raising=False)
    monkeypatch.delenv("FEATURE_FLAG_ENABLE_PRINT_RECIPES", raising=False)

    response = await client.get("/api/feature-flags")

    assert response.status_code == 200
    assert response.json() == {
        "enable-content-moderation": False,
        "enable-email-shopping-list": False,
        "enable-shared-links": False,
        "enable-feedback": False,
        "enable-print-recipes": True,
    }


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


# ── Azure App Configuration integration tests ──


class _FakeAppConfigProvider(dict):
    """Minimal dict-like provider that returns feature flag settings."""
    pass


@pytest.fixture(autouse=True)
def _reset_app_config_provider():
    """Ensure each test starts with no App Configuration provider."""
    init_app_config(None)
    yield
    init_app_config(None)


def test_app_config_flag_is_used_when_provider_set(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.delenv("FEATURE_FLAG_ENABLE_FEEDBACK", raising=False)
    monkeypatch.setenv("FEATURE_FLAGS_ENV", "dev")

    provider = _FakeAppConfigProvider({
        "feature_management": {
            "feature_flags": [
                {"id": "enable-feedback", "enabled": True},
            ]
        }
    })
    init_app_config(provider)

    assert is_feature_enabled("enable-feedback") is True


def test_env_var_overrides_app_config(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("FEATURE_FLAG_ENABLE_FEEDBACK", "false")

    provider = _FakeAppConfigProvider({
        "feature_management": {
            "feature_flags": [
                {"id": "enable-feedback", "enabled": True},
            ]
        }
    })
    init_app_config(provider)

    assert is_feature_enabled("enable-feedback") is False


def test_ff_prefixed_env_var_overrides_app_config(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.delenv("FEATURE_FLAG_ENABLE_FEEDBACK", raising=False)
    monkeypatch.setenv("FF_ENABLE_FEEDBACK", "false")

    provider = _FakeAppConfigProvider({
        "feature_management": {
            "feature_flags": [
                {"id": "enable-feedback", "enabled": True},
            ]
        }
    })
    init_app_config(provider)

    assert is_feature_enabled("enable-feedback") is False


def test_defaults_used_when_app_config_missing_flag(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.delenv("FEATURE_FLAG_ENABLE_PRINT_RECIPES", raising=False)
    monkeypatch.setenv("FEATURE_FLAGS_ENV", "dev")

    provider = _FakeAppConfigProvider({})  # no flags loaded
    init_app_config(provider)

    # dev default for enable-print-recipes is True
    assert is_feature_enabled("enable-print-recipes") is True


def test_resolve_returns_none_when_no_provider():
    init_app_config(None)
    assert _resolve_from_app_config("enable-feedback") is None
