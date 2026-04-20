import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.middleware.auth import TroopContext, require_troop_context
from app.routers import feedback as feedback_router


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    yield
    app.dependency_overrides.clear()


def _set_auth_override(role: str, user_id: str):
    async def _override():
        return TroopContext(
            userId=user_id,
            email=f"{user_id}@example.com",
            displayName=user_id,
            troopId="troop-1",
            role=role,
        )

    app.dependency_overrides[require_troop_context] = _override


@pytest.mark.asyncio
async def test_scout_can_delete_own_feedback(client, monkeypatch):
    _set_auth_override("scout", "scout-1")

    async def fake_get_by_id(container: str, item_id: str, troop_id: str):
        return {"id": item_id, "troopId": troop_id, "createdBy": {"userId": "scout-1"}}

    calls: list[tuple[str, str, str]] = []

    async def fake_delete_item(container: str, item_id: str, troop_id: str):
        calls.append((container, item_id, troop_id))

    monkeypatch.setattr(feedback_router, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(feedback_router, "delete_item", fake_delete_item)

    response = await client.delete("/api/feedback/fb-1")

    assert response.status_code == 204
    assert calls == [("feedback", "fb-1", "troop-1")]


@pytest.mark.asyncio
async def test_scout_cannot_delete_another_scout_feedback(client, monkeypatch):
    _set_auth_override("scout", "scout-1")

    async def fake_get_by_id(container: str, item_id: str, troop_id: str):
        return {"id": item_id, "troopId": troop_id, "createdBy": {"userId": "scout-2"}}

    delete_called = False

    async def fake_delete_item(container: str, item_id: str, troop_id: str):
        nonlocal delete_called
        delete_called = True

    monkeypatch.setattr(feedback_router, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(feedback_router, "delete_item", fake_delete_item)

    response = await client.delete("/api/feedback/fb-1")

    assert response.status_code == 403
    assert response.json() == {"detail": "You can only delete your own feedback"}
    assert delete_called is False


@pytest.mark.asyncio
async def test_leader_can_delete_any_feedback(client, monkeypatch):
    _set_auth_override("adultLeader", "leader-1")

    async def fake_get_by_id(container: str, item_id: str, troop_id: str):
        return {"id": item_id, "troopId": troop_id, "createdBy": {"userId": "scout-2"}}

    calls: list[tuple[str, str, str]] = []

    async def fake_delete_item(container: str, item_id: str, troop_id: str):
        calls.append((container, item_id, troop_id))

    monkeypatch.setattr(feedback_router, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(feedback_router, "delete_item", fake_delete_item)

    response = await client.delete("/api/feedback/fb-1")

    assert response.status_code == 204
    assert calls == [("feedback", "fb-1", "troop-1")]
