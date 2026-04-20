from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.middleware.auth import TroopContext
from app.routers import members, troops


def _contains_value_recursively(payload, value: str) -> bool:
    if isinstance(payload, dict):
        return any(_contains_value_recursively(v, value) for v in payload.values())
    if isinstance(payload, list):
        return any(_contains_value_recursively(v, value) for v in payload)
    if isinstance(payload, str):
        return value in payload
    return payload == value


@pytest.mark.asyncio
async def test_member_data_deletion_anonymizes_records_and_scrubs_pii(monkeypatch):
    auth = TroopContext(
        userId="admin-1",
        email="admin@example.com",
        displayName="Admin",
        troopId="troop-1",
        role="troopAdmin",
    )
    removed_member_id = "member-1"
    removed_user_id = "removed-user-1"
    removed_email = "removed@example.com"

    updated_feedback_docs: list[dict] = []
    updated_event_docs: list[dict] = []
    deleted_members: list[tuple[str, str, str]] = []

    async def fake_query_items(container: str, query: str, parameters: list[dict] | None = None):
        if container == "members":
            assert "c.id = @id" in query
            assert parameters
            return [{
                "id": removed_member_id,
                "troopId": auth.troopId,
                "userId": removed_user_id,
                "email": removed_email,
            }]
        if container == "feedback":
            return [{
                "id": "feedback-1",
                "troopId": auth.troopId,
                "memberId": removed_member_id,
                "scoutName": "Removed Scout",
                "createdBy": {"userId": removed_user_id, "email": removed_email, "displayName": "Removed Scout"},
                "updatedBy": {"userId": removed_user_id, "email": removed_email, "displayName": "Removed Scout"},
            }]
        if container == "events":
            return [{
                "id": "event-1",
                "troopId": auth.troopId,
                "memberId": removed_member_id,
                "createdBy": {"userId": removed_user_id, "email": removed_email, "displayName": "Removed Scout"},
                "updatedBy": {"userId": removed_user_id, "email": removed_email, "displayName": "Removed Scout"},
            }]
        return []

    async def fake_update_item(container: str, _item_id: str, payload: dict, _partition_key: str | None = None):
        if container == "feedback":
            updated_feedback_docs.append(payload)
        if container == "events":
            updated_event_docs.append(payload)
        return payload

    async def fake_delete_item(container: str, item_id: str, partition_key: str | None = None):
        deleted_members.append((container, item_id, partition_key or ""))

    monkeypatch.setattr(members, "query_items", fake_query_items)
    monkeypatch.setattr(members, "update_item", fake_update_item)
    monkeypatch.setattr(members, "delete_item", fake_delete_item)

    await members.delete_member_data(removed_member_id, auth)

    assert len(updated_feedback_docs) == 1
    assert len(updated_event_docs) == 1

    feedback = updated_feedback_docs[0]
    event = updated_event_docs[0]

    assert "memberId" not in feedback
    assert "memberId" not in event
    assert feedback["scoutName"] == "Deleted Member"
    assert feedback["createdBy"] == members.DELETED_MEMBER_AUDIT
    assert feedback["updatedBy"] == members.DELETED_MEMBER_AUDIT
    assert event["createdBy"] == members.DELETED_MEMBER_AUDIT
    assert event["updatedBy"] == members.DELETED_MEMBER_AUDIT

    for payload in [feedback, event]:
        assert not _contains_value_recursively(payload, removed_user_id)
        assert not _contains_value_recursively(payload, removed_email)

    assert deleted_members == [("members", removed_member_id, auth.troopId)]


@pytest.mark.asyncio
async def test_troop_deletion_cascade_deletes_members_events_feedback_and_recipes(monkeypatch):
    auth = TroopContext(
        userId="admin-1",
        email="admin@example.com",
        displayName="Admin",
        troopId="troop-1",
        role="troopAdmin",
    )

    deleted_items: list[tuple[str, str, str | None]] = []

    async def fake_get_by_id(_container: str, _item_id: str, _partition_key: str | None = None):
        return {"id": auth.troopId}

    async def fake_query_items(container: str, _query: str, _parameters: list[dict] | None = None):
        return [
            {"id": f"{container}-1"},
            {"id": f"{container}-2"},
        ]

    async def fake_delete_item(container: str, item_id: str, partition_key: str | None = None):
        deleted_items.append((container, item_id, partition_key))

    monkeypatch.setattr(troops, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(troops, "query_items", fake_query_items)
    monkeypatch.setattr(troops, "delete_item", fake_delete_item)

    await troops.delete_troop(auth)

    for container in troops.CASCADE_DELETE_CONTAINERS:
        assert (container, f"{container}-1", auth.troopId) in deleted_items
        assert (container, f"{container}-2", auth.troopId) in deleted_items

    assert ("troops", auth.troopId, None) in deleted_items


@pytest.mark.asyncio
async def test_troop_deletion_ignores_not_found_deletes_and_continues(monkeypatch):
    auth = TroopContext(
        userId="admin-1",
        email="admin@example.com",
        displayName="Admin",
        troopId="troop-1",
        role="troopAdmin",
    )

    class NotFoundError(Exception):
        status_code = 404

    deleted: list[tuple[str, str]] = []

    async def fake_get_by_id(_container: str, _item_id: str, _partition_key: str | None = None):
        return {"id": auth.troopId}

    async def fake_query_items(container: str, _query: str, _parameters: list[dict] | None = None):
        return [{"id": f"{container}-1"}]

    async def fake_delete_item(container: str, item_id: str, _partition_key: str | None = None):
        if container == "feedback":
            raise NotFoundError("already removed")
        deleted.append((container, item_id))

    monkeypatch.setattr(troops, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(troops, "query_items", fake_query_items)
    monkeypatch.setattr(troops, "delete_item", fake_delete_item)

    await troops.delete_troop(auth)

    assert ("members", "members-1") in deleted
    assert ("events", "events-1") in deleted
    assert ("recipes", "recipes-1") in deleted
    assert ("troops", auth.troopId) in deleted


@pytest.mark.asyncio
async def test_troop_deletion_collects_non_404_failures_and_raises(monkeypatch):
    auth = TroopContext(
        userId="admin-1",
        email="admin@example.com",
        displayName="Admin",
        troopId="troop-1",
        role="troopAdmin",
    )

    async def fake_get_by_id(_container: str, _item_id: str, _partition_key: str | None = None):
        return {"id": auth.troopId}

    async def fake_query_items(container: str, _query: str, _parameters: list[dict] | None = None):
        return [{"id": f"{container}-1"}]

    async def fake_delete_item(container: str, _item_id: str, _partition_key: str | None = None):
        if container == "events":
            raise RuntimeError("boom")

    monkeypatch.setattr(troops, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(troops, "query_items", fake_query_items)
    monkeypatch.setattr(troops, "delete_item", fake_delete_item)

    with pytest.raises(HTTPException) as exc:
        await troops.delete_troop(auth)

    assert exc.value.status_code == 500
    assert exc.value.detail["error"] == "Troop deletion failed"
    assert any(f["container"] == "events" for f in exc.value.detail["failures"])
