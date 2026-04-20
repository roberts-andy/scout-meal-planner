from __future__ import annotations

import asyncio
from copy import deepcopy
from typing import Any

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.middleware import auth
from app.middleware.auth import TroopContext
from app.routers import event_packed, event_purchased, events


class ConflictError(Exception):
    def __init__(self):
        super().__init__("conflict")
        self.status_code = 412


class InMemoryEventStore:
    def __init__(self):
        self.events: dict[str, dict[str, Any]] = {}
        self._write_lock = asyncio.Lock()

    async def create_item(self, _container: str, item: dict[str, Any]) -> dict[str, Any]:
        saved = deepcopy(item)
        saved["_etag"] = "1"
        self.events[item["id"]] = saved
        return deepcopy(saved)

    async def get_by_id(self, _container: str, item_id: str, partition_key_value: str | None = None) -> dict[str, Any] | None:
        event = self.events.get(item_id)
        if not event:
            return None
        if partition_key_value and event.get("troopId") != partition_key_value:
            return None
        return deepcopy(event)

    async def update_item(
        self,
        _container: str,
        item_id: str,
        item: dict[str, Any],
        partition_key_value: str | None = None,
    ) -> dict[str, Any]:
        await asyncio.sleep(0.005)
        async with self._write_lock:
            existing = self.events.get(item_id)
            if not existing:
                raise ConflictError()
            if partition_key_value and existing.get("troopId") != partition_key_value:
                raise ConflictError()
            if item.get("_etag") != existing.get("_etag"):
                raise ConflictError()

            updated = deepcopy(item)
            updated["_etag"] = str(int(existing["_etag"]) + 1)
            self.events[item_id] = updated
            return deepcopy(updated)


@pytest_asyncio.fixture
async def client(monkeypatch: pytest.MonkeyPatch):
    store = InMemoryEventStore()

    monkeypatch.setattr(events, "create_item", store.create_item)
    monkeypatch.setattr(events, "get_by_id", store.get_by_id)
    monkeypatch.setattr(event_packed, "get_by_id", store.get_by_id)
    monkeypatch.setattr(event_packed, "update_item", store.update_item)
    monkeypatch.setattr(event_purchased, "get_by_id", store.get_by_id)
    monkeypatch.setattr(event_purchased, "update_item", store.update_item)

    async def override_troop_context() -> TroopContext:
        return TroopContext(
            userId="user-1",
            email="user-1@example.com",
            displayName="User 1",
            troopId="troop-1",
            role="troopAdmin",
        )

    app.dependency_overrides[auth.require_troop_context] = override_troop_context

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as http_client:
        try:
            yield http_client
        finally:
            app.dependency_overrides.pop(auth.require_troop_context, None)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("endpoint", "request_key", "response_key"),
    [
        ("packed", "packed", "packedItems"),
        ("purchased", "purchased", "purchasedItems"),
    ],
)
async def test_concurrent_toggles_persist_all_items(client: AsyncClient, endpoint: str, request_key: str, response_key: str):
    create_response = await client.post(
        "/api/events",
        json={
            "name": "Concurrent Toggle Test",
            "startDate": "2026-04-01",
            "endDate": "2026-04-02",
            "days": [],
            "packedItems": [],
            "purchasedItems": [],
        },
    )
    assert create_response.status_code == 201
    event_id = create_response.json()["id"]

    target_items = [f"item-{idx}" for idx in range(10)]
    responses = await asyncio.gather(*[
        client.patch(
            f"/api/events/{event_id}/{endpoint}",
            json={"item": item, request_key: True},
        )
        for item in target_items
    ])

    assert all(response.status_code == 200 for response in responses)

    get_response = await client.get(f"/api/events/{event_id}")
    assert get_response.status_code == 200
    data = get_response.json()
    assert set(target_items).issubset(set(data.get(response_key, [])))
