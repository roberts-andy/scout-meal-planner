"""RBAC enforcement tests for protected API endpoints."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.middleware.auth import TroopContext
from app.middleware.moderation import ModerationResult
from app.routers import (
    admin_flagged_content,
    email_shopping_list,
    event_packed,
    event_purchased,
    events,
    feedback,
    members,
    recipes,
    share,
    troops,
)


@pytest.fixture
def async_test_client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


def _event_payload() -> dict[str, Any]:
    return {
        "name": "Campout",
        "startDate": "2026-05-01",
        "endDate": "2026-05-02",
        "days": [{"date": "2026-05-01", "meals": []}],
    }


def _recipe_payload() -> dict[str, Any]:
    return {
        "name": "Trail Stew",
        "description": "Simple camp stew",
        "servings": 6,
        "ingredients": [{"id": "ing-1", "name": "Beans", "quantity": 1, "unit": "can", "category": "protein"}],
        "variations": [{"id": "var-1", "cookingMethod": "camp-stove", "equipment": [], "instructions": ["Heat and serve"]}],
    }


def _feedback_payload() -> dict[str, Any]:
    return {
        "eventId": "event-1",
        "mealId": "meal-1",
        "recipeId": "recipe-1",
        "scoutName": "Scout",
        "rating": {"taste": 4, "difficulty": 3, "portionSize": 4},
        "comments": "Great",
        "whatWorked": "Fast to cook",
        "whatToChange": "Add spice",
        "photos": [],
    }


@dataclass(frozen=True)
class EndpointCase:
    method: str
    path: str
    success_status: int
    denied_role: str
    body: dict[str, Any] | None = None


RBAC_ENDPOINT_CASES = [
    EndpointCase("post", "/api/events", 201, "scout", _event_payload()),
    EndpointCase("put", "/api/events/event-1", 200, "scout", _event_payload()),
    EndpointCase("delete", "/api/events/event-1", 204, "scout"),
    EndpointCase("get", "/api/events/event-1/share", 200, "scout"),
    EndpointCase("post", "/api/events/event-1/share", 200, "scout"),
    EndpointCase("delete", "/api/events/event-1/share", 204, "scout"),
    EndpointCase("post", "/api/feedback", 201, "parent", _feedback_payload()),
    EndpointCase("put", "/api/feedback/feedback-1", 200, "parent", _feedback_payload()),
    EndpointCase("delete", "/api/feedback/feedback-1", 204, "scout"),
    EndpointCase("post", "/api/recipes", 201, "scout", _recipe_payload()),
    EndpointCase("put", "/api/recipes/recipe-1", 200, "scout", _recipe_payload()),
    EndpointCase("delete", "/api/recipes/recipe-1", 204, "scout"),
    EndpointCase("post", "/api/members", 201, "scout", {"displayName": "New Scout", "role": "scout"}),
    EndpointCase("put", "/api/members/member-1", 200, "scout", {"status": "active"}),
    EndpointCase("delete", "/api/members/member-1", 204, "scout"),
    EndpointCase("delete", "/api/members/member-1/data", 204, "parent"),
    EndpointCase("put", "/api/troops", 200, "parent", {"name": "Troop Updated"}),
    EndpointCase("patch", "/api/events/event-1/packed", 200, "parent", {"item": "Stove", "packed": True}),
    EndpointCase("patch", "/api/events/event-1/purchased", 200, "parent", {"item": "Oats", "purchased": True}),
    EndpointCase(
        "post",
        "/api/events/event-1/shopping-list/email",
        202,
        "parent",
        {"recipientEmail": "recipient@example.com", "items": [{"name": "Oats", "quantity": 1, "unit": "bag"}]},
    ),
    EndpointCase("get", "/api/admin/flagged-content", 200, "parent"),
    EndpointCase("put", "/api/admin/flagged-content/recipe:recipe-1", 200, "parent", {"action": "approve"}),
    EndpointCase("patch", "/api/troops/troop-1/members/member-1", 200, "scout", {"status": "deactivated"}),
]


def _install_default_mocks(monkeypatch: pytest.MonkeyPatch):
    async def fake_get_by_id(container: str, item_id: str, *_args):
        if container == "troops":
            return {"id": "troop-1", "name": "Troop 1"}
        if container == "recipes":
            return {
                "id": item_id,
                "troopId": "troop-1",
                "name": "Recipe",
                "description": "",
                "servings": 1,
                "ingredients": [],
                "variations": [],
                "moderation": {"status": "approved"},
            }
        if container == "feedback":
            return {
                "id": item_id,
                "troopId": "troop-1",
                "eventId": "event-1",
                "recipeId": "recipe-1",
                "comments": "",
                "whatWorked": "",
                "whatToChange": "",
                "rating": {"taste": 3, "difficulty": 3, "portionSize": 3},
                "moderation": {"status": "approved"},
            }
        return {"id": item_id, "troopId": "troop-1", "days": [], "packedItems": [], "purchasedItems": []}

    async def fake_get_all_by_troop(*_args):
        return []

    async def fake_create_item(_container: str, item: dict[str, Any]):
        return item

    async def fake_update_item(_container: str, _item_id: str, item: dict[str, Any], *_args):
        return item

    async def fake_delete_item(*_args):
        return None

    async def fake_query_items(container: str, *_args):
        if container == "members":
            return [{"id": "member-1", "troopId": "troop-1", "role": "scout", "userId": "user-2", "status": "active"}]
        return []

    async def fake_moderate_text_fields(*_args):
        return ModerationResult(status="approved", checkedAt=0)

    monkeypatch.setattr(events, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(events, "get_all_by_troop", fake_get_all_by_troop)
    monkeypatch.setattr(events, "create_item", fake_create_item)
    monkeypatch.setattr(events, "update_item", fake_update_item)
    monkeypatch.setattr(events, "delete_item", fake_delete_item)

    monkeypatch.setattr(share, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(share, "get_all_by_troop", fake_get_all_by_troop)
    monkeypatch.setattr(share, "update_item", fake_update_item)
    monkeypatch.setattr(share, "query_items", fake_query_items)

    monkeypatch.setattr(feedback, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(feedback, "get_all_by_troop", fake_get_all_by_troop)
    monkeypatch.setattr(feedback, "create_item", fake_create_item)
    monkeypatch.setattr(feedback, "update_item", fake_update_item)
    monkeypatch.setattr(feedback, "delete_item", fake_delete_item)
    monkeypatch.setattr(feedback, "query_items", fake_query_items)
    monkeypatch.setattr(feedback, "moderate_text_fields", fake_moderate_text_fields)

    monkeypatch.setattr(recipes, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(recipes, "get_all_by_troop", fake_get_all_by_troop)
    monkeypatch.setattr(recipes, "create_item", fake_create_item)
    monkeypatch.setattr(recipes, "update_item", fake_update_item)
    monkeypatch.setattr(recipes, "delete_item", fake_delete_item)
    monkeypatch.setattr(recipes, "moderate_text_fields", fake_moderate_text_fields)

    monkeypatch.setattr(members, "query_items", fake_query_items)
    monkeypatch.setattr(members, "create_item", fake_create_item)
    monkeypatch.setattr(members, "update_item", fake_update_item)
    monkeypatch.setattr(members, "delete_item", fake_delete_item)

    monkeypatch.setattr(troops, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(troops, "update_item", fake_update_item)

    monkeypatch.setattr(event_packed, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(event_packed, "update_item", fake_update_item)

    monkeypatch.setattr(event_purchased, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(event_purchased, "update_item", fake_update_item)

    monkeypatch.setattr(email_shopping_list, "get_by_id", fake_get_by_id)

    monkeypatch.setattr(admin_flagged_content, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(admin_flagged_content, "get_all_by_troop", fake_get_all_by_troop)
    monkeypatch.setattr(admin_flagged_content, "update_item", fake_update_item)

    class _FakePoller:
        @staticmethod
        def result():
            return {"status": "Succeeded"}

    class _FakeEmailClient:
        @staticmethod
        def begin_send(_message):
            return _FakePoller()

    monkeypatch.setattr(email_shopping_list, "_get_email_client", lambda: _FakeEmailClient())
    monkeypatch.setenv("ACS_FROM_EMAIL", "noreply@example.com")


def _set_auth_role(monkeypatch: pytest.MonkeyPatch, role: str | None):
    async def fake_get_troop_context(_request):
        if role is None:
            return None
        return TroopContext(
            userId="user-1",
            email="leader@example.com",
            displayName="Leader",
            troopId="troop-1",
            role=role,
        )

    import app.middleware.auth as auth_middleware

    monkeypatch.setattr(auth_middleware, "get_troop_context", fake_get_troop_context)


async def _call(client: AsyncClient, case: EndpointCase):
    method = getattr(client, case.method)
    if case.body is None:
        return await method(case.path)
    return await method(case.path, json=case.body)


@pytest.mark.asyncio
@pytest.mark.parametrize("case", RBAC_ENDPOINT_CASES, ids=[f"{c.method.upper()} {c.path}" for c in RBAC_ENDPOINT_CASES])
async def test_insufficient_roles_receive_403(async_test_client, monkeypatch: pytest.MonkeyPatch, case: EndpointCase):
    _install_default_mocks(monkeypatch)
    _set_auth_role(monkeypatch, case.denied_role)
    response = await _call(async_test_client, case)
    assert response.status_code == 403


@pytest.mark.asyncio
@pytest.mark.parametrize("case", RBAC_ENDPOINT_CASES, ids=[f"{c.method.upper()} {c.path}" for c in RBAC_ENDPOINT_CASES])
async def test_troop_admin_can_access_protected_endpoints(async_test_client, monkeypatch: pytest.MonkeyPatch, case: EndpointCase):
    _install_default_mocks(monkeypatch)
    _set_auth_role(monkeypatch, "troopAdmin")
    response = await _call(async_test_client, case)
    assert response.status_code == case.success_status


@pytest.mark.asyncio
async def test_unauthenticated_request_returns_401(async_test_client, monkeypatch: pytest.MonkeyPatch):
    _install_default_mocks(monkeypatch)
    _set_auth_role(monkeypatch, None)
    response = await async_test_client.post("/api/events", json=_event_payload())
    assert response.status_code == 401
