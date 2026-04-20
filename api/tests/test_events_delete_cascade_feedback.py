from types import SimpleNamespace

import pytest

from app.routers import events


@pytest.mark.asyncio
async def test_delete_event_deletes_associated_feedback(monkeypatch):
    auth = SimpleNamespace(role="troopAdmin", troopId="troop-42")

    delete_calls: list[tuple[str, str, str]] = []

    monkeypatch.setattr(events, "check_permission", lambda role, permission: True)

    async def fake_query_items(container_name, query, parameters):
        assert container_name == "feedback"
        assert query == "SELECT * FROM c WHERE c.eventId = @eventId AND c.troopId = @troopId"
        assert parameters == [
            {"name": "@eventId", "value": "event-1"},
            {"name": "@troopId", "value": "troop-42"},
        ]
        return [
            {"id": "feedback-1", "troopId": "troop-42"},
            {"id": "feedback-2", "troopId": "troop-42"},
        ]

    async def fake_delete_item(container_name, item_id, partition_key_value):
        delete_calls.append((container_name, item_id, partition_key_value))

    monkeypatch.setattr(events, "query_items", fake_query_items)
    monkeypatch.setattr(events, "delete_item", fake_delete_item)

    await events.delete_event("event-1", auth)

    assert delete_calls == [
        ("feedback", "feedback-1", "troop-42"),
        ("feedback", "feedback-2", "troop-42"),
        ("events", "event-1", "troop-42"),
    ]
