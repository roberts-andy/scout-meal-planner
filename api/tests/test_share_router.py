from __future__ import annotations

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.middleware.auth import TroopContext
from app.routers import share


def _make_request(path: str) -> Request:
    return Request({
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
    })


@pytest.mark.asyncio
async def test_get_shared_event_uses_share_token_index(monkeypatch):
    calls: list[tuple[str, str, str | None]] = []

    async def fake_get_by_id(container_name: str, item_id: str, partition_key_value: str | None = None):
        calls.append((container_name, item_id, partition_key_value))
        if container_name == "share-tokens":
            return {"id": "token-1", "shareToken": "token-1", "eventId": "event-1", "troopId": "troop-1"}
        if container_name == "events":
            return {
                "id": "event-1",
                "troopId": "troop-1",
                "name": "Backpacking",
                "days": [{"date": "2026-05-01", "meals": [{"id": "m1", "recipeId": "r1"}]}],
                "shareToken": "token-1",
            }
        return None

    async def fake_get_all_by_troop(container_name: str, troop_id: str):
        assert container_name == "recipes"
        assert troop_id == "troop-1"
        return [
            {
                "id": "r1",
                "name": "Chili",
                "ingredients": [{"id": "i1", "name": "Beans"}],
                "variations": [],
            },
            {
                "id": "r2",
                "name": "Unused",
                "ingredients": [],
                "variations": [],
            },
        ]

    async def assert_query_items_not_called(*_args, **_kwargs):
        raise AssertionError("query_items should not be used for share-token lookup")

    monkeypatch.setattr(share, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(share, "get_all_by_troop", fake_get_all_by_troop)
    monkeypatch.setattr(share, "query_items", assert_query_items_not_called, raising=False)

    result = await share.get_shared_event("token-1")

    assert result["event"]["id"] == "event-1"
    assert [recipe["id"] for recipe in result["recipes"]] == ["r1"]
    assert calls[0] == ("share-tokens", "token-1", "token-1")


@pytest.mark.asyncio
async def test_create_event_share_creates_index_and_removes_old_token(monkeypatch):
    auth = TroopContext(
        userId="user-1",
        email="leader@example.com",
        displayName="Leader",
        troopId="troop-1",
        role="troopAdmin",
    )
    created_items: list[dict] = []
    deleted_items: list[tuple[str, str, str | None]] = []
    updated_items: list[dict] = []

    async def fake_get_by_id(container_name: str, item_id: str, partition_key_value: str | None = None):
        if container_name == "events":
            return {"id": "event-1", "troopId": "troop-1", "shareToken": "old-token"}
        if container_name == "share-tokens" and item_id == "new-token":
            return None
        if container_name == "share-tokens" and item_id == "old-token":
            return {"id": "old-token", "shareToken": "old-token"}
        return None

    async def fake_update_item(container_name: str, item_id: str, item: dict, partition_key_value: str | None = None):
        assert container_name == "events"
        assert item_id == "event-1"
        assert partition_key_value == "troop-1"
        updated_items.append(item)
        return item

    async def fake_delete_item(container_name: str, item_id: str, partition_key_value: str | None = None):
        deleted_items.append((container_name, item_id, partition_key_value))

    async def fake_create_item(container_name: str, item: dict):
        assert container_name == "share-tokens"
        created_items.append(item)
        return item

    monkeypatch.setattr(share, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(share, "update_item", fake_update_item)
    monkeypatch.setattr(share, "delete_item", fake_delete_item)
    monkeypatch.setattr(share, "create_item", fake_create_item)
    monkeypatch.setattr(share, "_generate_share_token", lambda: "new-token")

    response = await share.create_event_share("event-1", _make_request("/api/events/event-1/share"), auth)

    assert response["shareToken"] == "new-token"
    assert response["shareUrl"].endswith("/share/new-token")
    assert updated_items[0]["shareToken"] == "new-token"
    assert created_items[0]["eventId"] == "event-1"
    assert created_items[0]["troopId"] == "troop-1"
    assert deleted_items == [("share-tokens", "old-token", "old-token")]


@pytest.mark.asyncio
async def test_delete_event_share_removes_share_token_mapping(monkeypatch):
    auth = TroopContext(
        userId="user-1",
        email="leader@example.com",
        displayName="Leader",
        troopId="troop-1",
        role="troopAdmin",
    )
    updated_items: list[dict] = []
    deleted_items: list[tuple[str, str, str | None]] = []

    async def fake_get_by_id(container_name: str, item_id: str, partition_key_value: str | None = None):
        if container_name == "events":
            return {"id": "event-1", "troopId": "troop-1", "shareToken": "token-1", "name": "Campout"}
        if container_name == "share-tokens":
            return {"id": "token-1", "shareToken": "token-1", "eventId": "event-1", "troopId": "troop-1"}
        return None

    async def fake_update_item(_container_name: str, _item_id: str, item: dict, _partition_key_value: str | None = None):
        updated_items.append(item)
        return item

    async def fake_delete_item(container_name: str, item_id: str, partition_key_value: str | None = None):
        deleted_items.append((container_name, item_id, partition_key_value))

    monkeypatch.setattr(share, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(share, "update_item", fake_update_item)
    monkeypatch.setattr(share, "delete_item", fake_delete_item)

    await share.delete_event_share("event-1", auth)

    assert "shareToken" not in updated_items[0]
    assert deleted_items == [("share-tokens", "token-1", "token-1")]


@pytest.mark.asyncio
async def test_create_event_share_rolls_back_index_if_event_update_fails(monkeypatch):
    auth = TroopContext(
        userId="user-1",
        email="leader@example.com",
        displayName="Leader",
        troopId="troop-1",
        role="troopAdmin",
    )
    deleted_items: list[tuple[str, str, str | None]] = []

    async def fake_get_by_id(container_name: str, item_id: str, partition_key_value: str | None = None):
        if container_name == "events":
            return {"id": "event-1", "troopId": "troop-1"}
        return None

    async def fake_create_item(_container_name: str, _item: dict):
        return _item

    async def fake_update_item(_container_name: str, _item_id: str, _item: dict, _partition_key_value: str | None = None):
        raise RuntimeError("update failed")

    async def fake_delete_item(container_name: str, item_id: str, partition_key_value: str | None = None):
        deleted_items.append((container_name, item_id, partition_key_value))

    monkeypatch.setattr(share, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(share, "create_item", fake_create_item)
    monkeypatch.setattr(share, "update_item", fake_update_item)
    monkeypatch.setattr(share, "delete_item", fake_delete_item)
    monkeypatch.setattr(share, "_generate_share_token", lambda: "new-token")

    with pytest.raises(RuntimeError):
        await share.create_event_share("event-1", _make_request("/api/events/event-1/share"), auth)

    assert deleted_items == [("share-tokens", "new-token", "new-token")]


@pytest.mark.asyncio
async def test_get_shared_event_rejects_stale_mapping(monkeypatch):
    deleted_items: list[tuple[str, str, str | None]] = []

    async def fake_get_by_id(container_name: str, item_id: str, partition_key_value: str | None = None):
        if container_name == "share-tokens":
            return {"id": "token-1", "shareToken": "token-1", "eventId": "event-1", "troopId": "troop-1"}
        if container_name == "events":
            return {"id": "event-1", "troopId": "troop-1", "shareToken": "different-token"}
        return None

    async def fake_delete_item(container_name: str, item_id: str, partition_key_value: str | None = None):
        deleted_items.append((container_name, item_id, partition_key_value))

    monkeypatch.setattr(share, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(share, "delete_item", fake_delete_item)

    with pytest.raises(HTTPException) as exc:
        await share.get_shared_event("token-1")

    assert exc.value.status_code == 404
    assert deleted_items == [("share-tokens", "token-1", "token-1")]
