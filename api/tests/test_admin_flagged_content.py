from __future__ import annotations

import pytest

from app.middleware.auth import TroopContext
from app.routers import admin_flagged_content


@pytest.mark.asyncio
async def test_list_flagged_content_includes_pending_items(monkeypatch: pytest.MonkeyPatch):
    async def fake_get_all_by_troop(container: str, troop_id: str):
        if container == admin_flagged_content.RECIPES_CONTAINER:
            return [
                {"id": "recipe-pending", "troopId": troop_id, "moderation": {"status": "pending", "checkedAt": 10}},
                {"id": "recipe-flagged", "troopId": troop_id, "moderation": {"status": "flagged", "checkedAt": 20}},
                {"id": "recipe-approved", "troopId": troop_id, "moderation": {"status": "approved", "checkedAt": 30}},
            ]
        return []

    monkeypatch.setattr(admin_flagged_content, "get_all_by_troop", fake_get_all_by_troop)
    monkeypatch.setattr(admin_flagged_content, "check_permission", lambda _role, _permission: True)

    auth = TroopContext(
        userId="user-1",
        email="admin@example.com",
        displayName="Admin User",
        troopId="troop-1",
        role="troopAdmin",
    )

    result = await admin_flagged_content.list_flagged_content(auth)

    result_ids = {item["id"] for item in result}
    assert "recipe:recipe-pending" in result_ids
    assert "recipe:recipe-flagged" in result_ids
    assert "recipe:recipe-approved" not in result_ids
