from types import SimpleNamespace

import pytest

from app.middleware.moderation import ModerationResult
from app.routers import members as members_router
from app.schemas import CreateMember


@pytest.mark.asyncio
async def test_create_member_moderates_display_name(monkeypatch):
    captured = {}

    async def fake_query_items(*_args, **_kwargs):
        return []

    async def fake_moderate_text_fields(fields):
        captured["fields"] = [(field.field, field.text) for field in fields]
        return ModerationResult(status="flagged", flaggedFields=["displayName"], checkedAt=55)

    async def fake_create_item(_container, item):
        captured["item"] = item
        return item

    monkeypatch.setattr(members_router, "check_permission", lambda _role, _perm: True)
    monkeypatch.setattr(members_router, "query_items", fake_query_items)
    monkeypatch.setattr(members_router, "moderate_text_fields", fake_moderate_text_fields)
    monkeypatch.setattr(members_router, "create_item", fake_create_item)

    await members_router.create_member(
        CreateMember(displayName="Alex Patrol", role="scout"),
        SimpleNamespace(troopId="troop-1", role="troopAdmin"),
    )

    assert captured["fields"] == [("displayName", "Alex")]
    assert captured["item"]["displayName"] == "Alex"
    assert captured["item"]["moderation"] == {
        "status": "flagged",
        "flaggedFields": ["displayName"],
        "checkedAt": 55,
        "provider": "azure-content-safety",
    }
