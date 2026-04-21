from types import SimpleNamespace

import pytest

from app.middleware.moderation import ModerationResult
from app.routers import troops as troops_router
from app.schemas import CreateTroop, UpdateTroop


@pytest.mark.asyncio
async def test_create_troop_moderates_name(monkeypatch):
    captured = {}

    async def fake_moderate_text_fields(fields):
        captured["fields"] = [(field.field, field.text) for field in fields]
        return ModerationResult(status="approved", checkedAt=10)

    async def fake_create_item(container, item):
        captured.setdefault("created", []).append((container, item))
        return item

    monkeypatch.setattr(troops_router, "moderate_text_fields", fake_moderate_text_fields)
    monkeypatch.setattr(troops_router, "create_item", fake_create_item)

    await troops_router.create_troop(
        CreateTroop(name="Troop 123"),
        SimpleNamespace(userId="user-1", email="user@example.com", displayName="Leader"),
    )

    assert captured["fields"] == [("name", "Troop 123")]
    assert captured["created"][0][1]["moderation"] == {
        "status": "approved",
        "flaggedFields": [],
        "checkedAt": 10,
        "provider": "azure-content-safety",
    }


@pytest.mark.asyncio
async def test_update_troop_moderates_name(monkeypatch):
    captured = {}

    async def fake_get_by_id(*_args, **_kwargs):
        return {"id": "troop-1", "name": "Old Name"}

    async def fake_moderate_text_fields(fields):
        captured["fields"] = [(field.field, field.text) for field in fields]
        return ModerationResult(status="flagged", flaggedFields=["name"], checkedAt=20)

    async def fake_update_item(_container, _troop_id, updated):
        captured["updated"] = updated
        return updated

    monkeypatch.setattr(troops_router, "check_permission", lambda _role, _perm: True)
    monkeypatch.setattr(troops_router, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(troops_router, "moderate_text_fields", fake_moderate_text_fields)
    monkeypatch.setattr(troops_router, "update_item", fake_update_item)

    await troops_router.update_troop(
        UpdateTroop(name="Updated Name"),
        SimpleNamespace(troopId="troop-1", role="troopAdmin"),
    )

    assert captured["fields"] == [("name", "Updated Name")]
    assert captured["updated"]["moderation"] == {
        "status": "flagged",
        "flaggedFields": ["name"],
        "checkedAt": 20,
        "provider": "azure-content-safety",
    }
