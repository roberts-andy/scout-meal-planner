from __future__ import annotations

import pytest

from app.middleware.moderation import ModerationResult
from app.middleware.auth import TroopContext
from app.middleware.moderation import ModerationResult
from app.routers import admin_flagged_content
from app.schemas import ReviewFlaggedContentReject, FlaggedContentEdits, ReviewFlaggedContentEdit


@pytest.mark.asyncio
async def test_list_flagged_content_includes_pending_items(monkeypatch: pytest.MonkeyPatch):
    async def fake_get_all_by_troop(container: str, troop_id: str):
        if container == admin_flagged_content.RECIPES_CONTAINER:
            return [
                {"id": "recipe-pending", "troopId": troop_id, "moderation": {"status": "pending", "checkedAt": 10}},
                {"id": "recipe-flagged", "troopId": troop_id, "moderation": {"status": "flagged", "checkedAt": 20}},
                {"id": "recipe-rejected", "troopId": troop_id, "moderation": {"status": "rejected", "checkedAt": 25}},
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
    assert "recipe:recipe-rejected" not in result_ids
    assert "recipe:recipe-approved" not in result_ids


@pytest.mark.asyncio
async def test_review_reject_sets_rejected_status(monkeypatch: pytest.MonkeyPatch):
    existing_item = {
        "id": "feedback-1",
        "troopId": "troop-1",
        "comments": "bad comment",
        "moderation": {"status": "flagged", "flaggedFields": ["comments"]},
    }
    captured: dict = {}

    async def fake_get_by_id(_container: str, item_id: str, _troop_id: str):
        if item_id == "feedback-1":
            return existing_item
        return None

    async def fake_update_item(_container: str, _item_id: str, updated: dict, _troop_id: str):
        captured["updated"] = updated
        return updated

    monkeypatch.setattr(admin_flagged_content, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(admin_flagged_content, "update_item", fake_update_item)
    monkeypatch.setattr(admin_flagged_content, "check_permission", lambda _role, _permission: True)

    auth = TroopContext(
        userId="user-1",
        email="admin@example.com",
        displayName="Admin User",
        troopId="troop-1",
        role="troopAdmin",
    )

    result = await admin_flagged_content.review_flagged_content(
        "feedback:feedback-1",
        ReviewFlaggedContentReject(),
        auth,
    )

    assert captured["updated"]["moderation"]["status"] == "rejected"
    assert result["moderation"]["status"] == "rejected"


@pytest.mark.asyncio
async def test_list_flagged_content_includes_categories_and_flagged_text(monkeypatch: pytest.MonkeyPatch):
    async def fake_get_all_by_troop(container: str, troop_id: str):
        if container == admin_flagged_content.FEEDBACK_CONTAINER:
            return [{
                "id": "feedback-1",
                "troopId": troop_id,
                "comments": "I hate this meal",
                "moderation": {
                    "status": "flagged",
                    "checkedAt": 20,
                    "flaggedFields": ["comments"],
                    "categories": [{"category": "Hate", "severity": 4}],
                    "fieldCategories": [{
                        "field": "comments",
                        "categories": [{"category": "Hate", "severity": 4}],
                    }],
                },
            }]
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

    assert len(result) == 1
    assert result[0]["flagReason"] == "Flagged fields: comments (Hate severity 4/6)"
    assert result[0]["flaggedDetails"] == [{
        "field": "comments",
        "text": "I hate this meal",
        "categories": [{"category": "Hate", "severity": 4}],
    }]


@pytest.mark.asyncio
async def test_review_edit_re_moderates_updated_fields(monkeypatch: pytest.MonkeyPatch):
    captured = {}

    async def fake_resolve_item(_item_id: str, _troop_id: str):
        return {
            "status": "ok",
            "contentType": "recipe",
            "item": {
                "id": "recipe-1",
                "troopId": "troop-1",
                "name": "Original",
                "description": "Original description",
                "moderation": {"status": "flagged", "flaggedFields": ["description"]},
            },
        }

    async def fake_moderate_text_fields(fields):
        captured["fields"] = [(field.field, field.text) for field in fields]
        return ModerationResult(
            status="flagged",
            flaggedFields=["description"],
            checkedAt=999,
        )

    async def fake_update_item(_container: str, _item_id: str, updated: dict, _troop_id: str):
        captured["updated"] = updated
        return updated

    monkeypatch.setattr(admin_flagged_content, "check_permission", lambda _role, _permission: True)
    monkeypatch.setattr(admin_flagged_content, "_resolve_item", fake_resolve_item)
    monkeypatch.setattr(admin_flagged_content, "moderate_text_fields", fake_moderate_text_fields)
    monkeypatch.setattr(admin_flagged_content, "update_item", fake_update_item)

    auth = TroopContext(
        userId="user-1",
        email="admin@example.com",
        displayName="Admin User",
        troopId="troop-1",
        role="troopAdmin",
    )

    result = await admin_flagged_content.review_flagged_content(
        "recipe:recipe-1",
        admin_flagged_content.ReviewFlaggedContentEdit(action="edit", edits={"description": "Updated description"}),
        auth,
    )

    assert captured["fields"] == [("description", "Updated description")]
    assert captured["updated"]["description"] == "Updated description"
    assert captured["updated"]["moderation"]["status"] == "flagged"
    assert captured["updated"]["moderation"]["flaggedFields"] == ["description"]
    assert captured["updated"]["moderation"]["checkedAt"] == 999
    assert "reviewedAt" in captured["updated"]["moderation"]
    assert captured["updated"]["moderation"]["reviewedBy"] == {"userId": "user-1", "displayName": "Admin User"}
    assert result["moderation"]["status"] == "flagged"


@pytest.mark.asyncio
async def test_review_flagged_content_edit_approves_when_re_moderation_passes(monkeypatch: pytest.MonkeyPatch):
    auth = TroopContext(
        userId="user-1",
        email="admin@example.com",
        displayName="Admin User",
        troopId="troop-1",
        role="troopAdmin",
    )
    item = {
        "id": "feedback-1",
        "troopId": auth.troopId,
        "comments": "Original",
        "whatWorked": "Fine",
        "whatToChange": "N/A",
        "moderation": {"status": "flagged", "flaggedFields": ["comments"]},
    }
    captured_fields: list[tuple[str, str | None]] = []
    captured_update: dict = {}

    async def fake_resolve_item(_item_id: str, _troop_id: str):
        return {"status": "ok", "contentType": "feedback", "item": item}

    async def fake_moderate_text_fields(fields):
        captured_fields.extend((field.field, field.text) for field in fields)
        return ModerationResult(status="approved", flaggedFields=[], checkedAt=1700)

    async def fake_update_item(_container: str, _item_id: str, updated: dict, _troop_id: str):
        captured_update.update(updated)
        return updated

    monkeypatch.setattr(admin_flagged_content, "check_permission", lambda _role, _permission: True)
    monkeypatch.setattr(admin_flagged_content, "_resolve_item", fake_resolve_item)
    monkeypatch.setattr(admin_flagged_content, "moderate_text_fields", fake_moderate_text_fields)
    monkeypatch.setattr(admin_flagged_content, "update_item", fake_update_item)

    body = ReviewFlaggedContentEdit(action="edit", edits=FlaggedContentEdits(comments="Cleaned text"))
    result = await admin_flagged_content.review_flagged_content("feedback:feedback-1", body, auth)

    assert ("comments", "Cleaned text") in captured_fields
    assert captured_update["comments"] == "Cleaned text"
    assert captured_update["moderation"]["status"] == "approved"
    assert captured_update["moderation"]["flaggedFields"] == []
    assert result["moderation"]["status"] == "approved"


@pytest.mark.asyncio
async def test_review_flagged_content_edit_stays_flagged_when_re_moderation_flags(monkeypatch: pytest.MonkeyPatch):
    auth = TroopContext(
        userId="user-1",
        email="admin@example.com",
        displayName="Admin User",
        troopId="troop-1",
        role="troopAdmin",
    )
    item = {
        "id": "feedback-1",
        "troopId": auth.troopId,
        "comments": "Original",
        "whatWorked": "Fine",
        "whatToChange": "N/A",
        "moderation": {"status": "flagged", "flaggedFields": ["comments"]},
    }
    captured_update: dict = {}

    async def fake_resolve_item(_item_id: str, _troop_id: str):
        return {"status": "ok", "contentType": "feedback", "item": item}

    async def fake_moderate_text_fields(_fields):
        return ModerationResult(status="flagged", flaggedFields=["comments"], checkedAt=1700)

    async def fake_update_item(_container: str, _item_id: str, updated: dict, _troop_id: str):
        captured_update.update(updated)
        return updated

    monkeypatch.setattr(admin_flagged_content, "check_permission", lambda _role, _permission: True)
    monkeypatch.setattr(admin_flagged_content, "_resolve_item", fake_resolve_item)
    monkeypatch.setattr(admin_flagged_content, "moderate_text_fields", fake_moderate_text_fields)
    monkeypatch.setattr(admin_flagged_content, "update_item", fake_update_item)

    body = ReviewFlaggedContentEdit(action="edit", edits=FlaggedContentEdits(comments="Still unsafe"))
    result = await admin_flagged_content.review_flagged_content("feedback:feedback-1", body, auth)

    assert captured_update["moderation"]["status"] == "flagged"
    assert captured_update["moderation"]["flaggedFields"] == ["comments"]
    assert result["moderation"]["status"] == "flagged"
