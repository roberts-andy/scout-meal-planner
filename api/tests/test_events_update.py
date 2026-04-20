from types import SimpleNamespace

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.middleware.auth import require_troop_context
from app.routers import events as events_router


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.fixture(autouse=True)
def reset_dependency_overrides():
    app.dependency_overrides = {}
    yield
    app.dependency_overrides = {}


@pytest.mark.asyncio
async def test_update_event_preserves_packed_and_purchased_items_when_omitted(client, monkeypatch):
    existing_event = {
        "id": "event-1",
        "troopId": "troop-1",
        "name": "Spring Campout",
        "startDate": "2026-05-01",
        "endDate": "2026-05-03",
        "days": [],
        "packedItems": ["Skillet"],
        "purchasedItems": ["beans-can"],
        "notes": "Original notes",
    }

    async def fake_get_by_id(*_args, **_kwargs):
        return existing_event

    async def fake_update_item(*_args, **_kwargs):
        return _args[2]

    monkeypatch.setattr(events_router, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(events_router, "update_item", fake_update_item)

    app.dependency_overrides[require_troop_context] = lambda: SimpleNamespace(
        userId="user-1",
        email="leader@example.com",
        displayName="Leader",
        troopId="troop-1",
        role="troopAdmin",
    )

    response = await client.put(
        "/api/events/event-1",
        json={
            "name": "Updated Campout Name",
            "startDate": "2026-05-01",
            "endDate": "2026-05-03",
            "days": [],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Updated Campout Name"
    assert body["packedItems"] == ["Skillet"]
    assert body["purchasedItems"] == ["beans-can"]
