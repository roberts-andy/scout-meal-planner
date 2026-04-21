from types import SimpleNamespace

import pytest
from httpx import ASGITransport, AsyncClient
from unittest.mock import Mock, call

from app.main import app
from app.middleware.auth import require_troop_context
from app.middleware.moderation import ModerationResult
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


@pytest.mark.asyncio
async def test_update_event_emits_recipe_assigned_custom_event(client, monkeypatch):
    existing_event = {
        "id": "event-1",
        "troopId": "troop-1",
        "name": "Spring Campout",
        "startDate": "2026-05-01",
        "endDate": "2026-05-03",
        "days": [{"date": "2026-05-01", "meals": [{"id": "meal-1", "type": "breakfast", "scoutCount": 4}]}],
    }
    track_custom_event = Mock()

    async def fake_get_by_id(*_args, **_kwargs):
        return existing_event

    async def fake_update_item(*_args, **_kwargs):
        return _args[2]

    monkeypatch.setattr(events_router, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(events_router, "update_item", fake_update_item)
    monkeypatch.setattr(events_router, "track_custom_event", track_custom_event)

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
            "days": [
                {"date": "2026-05-01", "meals": [{"id": "meal-1", "type": "breakfast", "scoutCount": 4, "recipeId": "recipe-1"}]},
            ],
        },
    )

    assert response.status_code == 200
    track_custom_event.assert_called_once_with("recipe_assigned", properties={
        "eventId": "event-1",
        "troopId": "troop-1",
        "assignmentCount": "1",
    })


@pytest.mark.asyncio
async def test_create_event_emits_recipe_assigned_custom_event_when_meals_preassigned(client, monkeypatch):
    track_custom_event = Mock()

    async def fake_create_item(*_args, **_kwargs):
        return {
            "id": "event-2",
            "troopId": "troop-1",
            "name": "Summer Campout",
            "startDate": "2026-06-01",
            "endDate": "2026-06-02",
            "days": [
                {
                    "date": "2026-06-01",
                    "meals": [
                        {"id": "meal-1", "type": "breakfast", "scoutCount": 4, "recipeId": "recipe-1"},
                        {"id": "meal-2", "type": "dinner", "scoutCount": 4, "recipeId": "recipe-2"},
                    ],
                },
            ],
        }

    monkeypatch.setattr(events_router, "create_item", fake_create_item)
    monkeypatch.setattr(events_router, "track_custom_event", track_custom_event)

    app.dependency_overrides[require_troop_context] = lambda: SimpleNamespace(
        userId="user-1",
        email="leader@example.com",
        displayName="Leader",
        troopId="troop-1",
        role="troopAdmin",
    )

    response = await client.post(
        "/api/events",
        json={
            "name": "Summer Campout",
            "startDate": "2026-06-01",
            "endDate": "2026-06-02",
            "days": [
                {
                    "date": "2026-06-01",
                    "meals": [
                        {"id": "meal-1", "type": "breakfast", "scoutCount": 4, "recipeId": "recipe-1"},
                        {"id": "meal-2", "type": "dinner", "scoutCount": 4, "recipeId": "recipe-2"},
                    ],
                },
            ],
        },
    )

    assert response.status_code == 201
    assert track_custom_event.call_args_list == [
        call("event_created", properties={
            "eventId": "event-2",
            "troopId": "troop-1",
        }),
        call("recipe_assigned", properties={
            "eventId": "event-2",
            "troopId": "troop-1",
            "assignmentCount": "2",
        }),
    ]


@pytest.mark.asyncio
async def test_logistics_fields_round_trip(client, monkeypatch):
    stored_events: dict[str, dict] = {}

    async def fake_create_item(*_args, **_kwargs):
        payload = _args[1]
        stored_events[payload["id"]] = payload
        return payload

    async def fake_get_by_id(*_args, **_kwargs):
        event_id = _args[1]
        troop_id = _args[2]
        event = stored_events.get(event_id)
        if event and event["troopId"] == troop_id:
            return event
        return None

    monkeypatch.setattr(events_router, "create_item", fake_create_item)
    monkeypatch.setattr(events_router, "get_by_id", fake_get_by_id)

    app.dependency_overrides[require_troop_context] = lambda: SimpleNamespace(
        userId="user-1",
        email="leader@example.com",
        displayName="Leader",
        troopId="troop-1",
        role="troopAdmin",
    )

    payload = {
        "name": "Summer Camp",
        "startDate": "2026-07-10",
        "endDate": "2026-07-12",
        "departureTime": "08:05",
        "returnTime": "17:30",
        "headcount": {
            "scoutCount": 15,
            "adultCount": 4,
            "guestCount": 1,
        },
        "days": [],
    }

    create_response = await client.post("/api/events", json=payload)
    assert create_response.status_code == 201

    created = create_response.json()
    get_response = await client.get(f"/api/events/{created['id']}")
    assert get_response.status_code == 200

    fetched = get_response.json()
    assert fetched["departureTime"] == "08:05"
    assert fetched["returnTime"] == "17:30"
    assert fetched["headcount"] == {
        "scoutCount": 15,
        "adultCount": 4,
        "guestCount": 1,
    }


@pytest.mark.asyncio
async def test_get_event_migrates_legacy_characteristics_to_tags(client, monkeypatch):
    async def fake_get_by_id(*_args, **_kwargs):
        return {
            "id": "event-1",
            "troopId": "troop-1",
            "name": "Legacy Campout",
            "startDate": "2026-07-01",
            "endDate": "2026-07-02",
            "days": [],
            "hike": True,
            "highAltitude": True,
            "tags": ["Backpacking"],
        }

    monkeypatch.setattr(events_router, "get_by_id", fake_get_by_id)

    app.dependency_overrides[require_troop_context] = lambda: SimpleNamespace(
        userId="user-1",
        email="leader@example.com",
        displayName="Leader",
        troopId="troop-1",
        role="troopAdmin",
    )

    response = await client.get("/api/events/event-1")

    assert response.status_code == 200
    assert response.json()["tags"] == ["Backpacking", "Hike", "High Altitude"]


@pytest.mark.asyncio
async def test_create_event_moderates_text_fields(client, monkeypatch):
    captured = {}

    async def fake_moderate_text_fields(fields):
        captured["fields"] = [(field.field, field.text) for field in fields]
        return ModerationResult(status="flagged", flaggedFields=["notes"], checkedAt=123)

    async def fake_create_item(*_args, **_kwargs):
        captured["item"] = _args[1]
        return _args[1]

    monkeypatch.setattr(events_router, "moderate_text_fields", fake_moderate_text_fields)
    monkeypatch.setattr(events_router, "create_item", fake_create_item)

    app.dependency_overrides[require_troop_context] = lambda: SimpleNamespace(
        userId="user-1",
        email="leader@example.com",
        displayName="Leader",
        troopId="troop-1",
        role="troopAdmin",
    )

    response = await client.post(
        "/api/events",
        json={
            "name": "Summer Campout",
            "description": "Weekend trip",
            "notes": "Bring warm layers",
            "startDate": "2026-06-01",
            "endDate": "2026-06-02",
            "days": [
                {
                    "date": "2026-06-01",
                    "meals": [
                        {"id": "meal-1", "type": "breakfast", "scoutCount": 4, "notes": "No peanuts"},
                    ],
                },
            ],
        },
    )

    assert response.status_code == 201
    assert captured["fields"] == [
        ("name", "Summer Campout"),
        ("description", "Weekend trip"),
        ("notes", "Bring warm layers"),
        ("days[0].meals[0].notes", "No peanuts"),
    ]
    assert captured["item"]["moderation"] == {
        "status": "flagged",
        "flaggedFields": ["notes"],
        "checkedAt": 123,
        "provider": "azure-content-safety",
    }


@pytest.mark.asyncio
async def test_update_event_moderates_updated_text_fields(client, monkeypatch):
    captured = {}

    async def fake_get_by_id(*_args, **_kwargs):
        return {
            "id": "event-1",
            "troopId": "troop-1",
            "name": "Old Name",
            "startDate": "2026-05-01",
            "endDate": "2026-05-03",
            "days": [],
        }

    async def fake_moderate_text_fields(fields):
        captured["fields"] = [(field.field, field.text) for field in fields]
        return ModerationResult(status="approved", checkedAt=321)

    async def fake_update_item(*_args, **_kwargs):
        captured["item"] = _args[2]
        return _args[2]

    monkeypatch.setattr(events_router, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(events_router, "moderate_text_fields", fake_moderate_text_fields)
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
        json={"description": "Updated description"},
    )

    assert response.status_code == 200
    assert captured["fields"] == [("description", "Updated description")]
    assert captured["item"]["moderation"] == {
        "status": "approved",
        "flaggedFields": [],
        "checkedAt": 321,
        "provider": "azure-content-safety",
    }
