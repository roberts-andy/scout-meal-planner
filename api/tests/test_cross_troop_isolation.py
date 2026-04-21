"""Cross-troop data isolation tests for troop-scoped endpoints."""
from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.middleware.auth import TroopContext, require_troop_context
from app.routers import event_packed, event_purchased, events, feedback, members, recipes, share


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as async_client:
        yield async_client


@pytest.fixture
def troop_a_context():
    previous = app.dependency_overrides.get(require_troop_context)

    async def _override():
        return TroopContext(
            userId="user-a",
            email="user-a@example.com",
            displayName="User A",
            troopId="troop-a",
            role="troopAdmin",
        )

    app.dependency_overrides[require_troop_context] = _override
    yield
    if previous is None:
        app.dependency_overrides.pop(require_troop_context, None)
    else:
        app.dependency_overrides[require_troop_context] = previous


@pytest.mark.asyncio
async def test_list_endpoints_return_only_callers_troop_data(client, troop_a_context, monkeypatch):
    async def fake_list_events(container_name: str, query: str, parameters: list[dict], *, limit: int, continuation_token):
        assert container_name == "events"
        assert "c.troopId = @troopId" in query
        assert {"name": "@troopId", "value": "troop-a"} in parameters
        assert limit == 50
        assert continuation_token is None
        return [{"id": "event-a", "troopId": "troop-a"}], None

    async def fake_list_recipes(container_name: str, query: str, parameters: list[dict], *, limit: int, continuation_token):
        assert container_name == "recipes"
        assert "c.troopId = @troopId" in query
        assert {"name": "@troopId", "value": "troop-a"} in parameters
        assert limit == 50
        assert continuation_token is None
        return [{"id": "recipe-a", "troopId": "troop-a"}], None

    async def fake_list_members(container_name: str, query: str, parameters: list[dict], *, limit: int, continuation_token):
        assert container_name == "members"
        assert "c.troopId = @troopId" in query
        assert {"name": "@troopId", "value": "troop-a"} in parameters
        assert limit == 50
        assert continuation_token is None
        return [{"id": "member-a", "troopId": "troop-a"}], None

    monkeypatch.setattr(events, "query_items_paginated", fake_list_events)
    monkeypatch.setattr(recipes, "query_items_paginated", fake_list_recipes)
    monkeypatch.setattr(members, "query_items_paginated", fake_list_members)

    events_response = await client.get("/api/events")
    assert events_response.status_code == 200
    assert events_response.json() == {"items": [{"id": "event-a", "troopId": "troop-a", "tags": []}], "continuationToken": None}

    members_response = await client.get("/api/members")
    assert members_response.status_code == 200
    assert members_response.json() == {"items": [{"id": "member-a", "troopId": "troop-a"}], "continuationToken": None}

    recipes_response = await client.get("/api/recipes")
    assert recipes_response.status_code == 200
    assert recipes_response.json() == {"items": [{"id": "recipe-a", "troopId": "troop-a"}], "continuationToken": None}


@pytest.mark.asyncio
async def test_cross_troop_resource_ids_return_404(client, troop_a_context, monkeypatch):
    get_by_id_calls: list[tuple[str, str, str]] = []

    async def fake_get_by_id(container_name: str, item_id: str, troop_id: str):
        get_by_id_calls.append((container_name, item_id, troop_id))
        assert troop_id == "troop-a"
        return None

    async def should_not_update(*_args, **_kwargs):
        pytest.fail("update_item should not be called for cross-troop resources")

    monkeypatch.setattr(events, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(recipes, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(event_packed, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(event_purchased, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(share, "get_by_id", fake_get_by_id)

    monkeypatch.setattr(events, "update_item", should_not_update)
    monkeypatch.setattr(recipes, "update_item", should_not_update)
    monkeypatch.setattr(event_packed, "update_item", should_not_update)
    monkeypatch.setattr(event_purchased, "update_item", should_not_update)
    monkeypatch.setattr(share, "update_item", should_not_update)

    event_payload = {
        "name": "Campout",
        "startDate": "2026-06-01",
        "endDate": "2026-06-02",
        "days": [{"date": "2026-06-01", "meals": [{"id": "m1", "type": "dinner", "scoutCount": 8}]}],
    }
    recipe_payload = {
        "name": "Chili",
        "servings": 8,
        "ingredients": [{"id": "i1", "name": "Beans", "quantity": 1, "unit": "can"}],
        "variations": [{"id": "v1", "cookingMethod": "camp-stove", "instructions": ["Cook"], "equipment": []}],
    }

    assert (await client.get("/api/events/event-b")).status_code == 404
    assert (await client.put("/api/events/event-b", json=event_payload)).status_code == 404
    assert (await client.get("/api/recipes/recipe-b")).status_code == 404
    assert (await client.put("/api/recipes/recipe-b", json=recipe_payload)).status_code == 404
    assert (await client.patch("/api/events/event-b/packed", json={"item": "Tent", "packed": True})).status_code == 404
    assert (await client.patch("/api/events/event-b/purchased", json={"item": "Fuel", "purchased": True})).status_code == 404
    assert (await client.get("/api/events/event-b/share")).status_code == 404
    assert (await client.post("/api/events/event-b/share")).status_code == 404
    assert (await client.delete("/api/events/event-b/share")).status_code == 404

    assert len(get_by_id_calls) == 9
    assert all(call[2] == "troop-a" for call in get_by_id_calls)


@pytest.mark.asyncio
async def test_feedback_by_other_troop_event_returns_empty(client, troop_a_context, monkeypatch):
    async def fake_query_feedback(container_name: str, query: str, parameters: list[dict]):
        assert container_name == "feedback"
        assert "c.eventId = @eventId" in query
        assert {"name": "@eventId", "value": "event-b"} in parameters
        assert {"name": "@troopId", "value": "troop-a"} in parameters
        return []

    monkeypatch.setattr(feedback, "query_items", fake_query_feedback)

    response = await client.get("/api/feedback/event/event-b")
    assert response.status_code == 200
    assert response.json() == []
