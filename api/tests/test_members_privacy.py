import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.middleware import auth
from app.middleware.auth import TroopContext
from app.routers import members as members_router


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    app.dependency_overrides = {}
    yield
    app.dependency_overrides = {}


@pytest.mark.asyncio
async def test_list_members_redacts_pii_for_non_manage_members_role(client, monkeypatch):
    stored_members = [
        {
            "id": "m1",
            "troopId": "t1",
            "displayName": "Leader One",
            "role": "adultLeader",
            "status": "active",
            "email": "leader1@example.com",
            "userId": "u1",
        }
    ]

    async def fake_query_items_paginated(*_args, **_kwargs):
        return stored_members, None

    async def fake_require_troop_context():
        return TroopContext(
            userId="scout-user",
            email="scout@example.com",
            displayName="Scout One",
            troopId="t1",
            role="scout",
        )

    monkeypatch.setattr(members_router, "query_items_paginated", fake_query_items_paginated)
    app.dependency_overrides[auth.require_troop_context] = fake_require_troop_context

    response = await client.get("/api/members")

    assert response.status_code == 200
    assert response.json() == {
        "items": [
            {
                "id": "m1",
                "displayName": "Leader One",
                "role": "adultLeader",
                "status": "active",
            }
        ],
        "continuationToken": None,
    }


@pytest.mark.asyncio
async def test_list_members_returns_full_record_for_manage_members_role(client, monkeypatch):
    stored_members = [
        {
            "id": "m1",
            "troopId": "t1",
            "displayName": "Leader One",
            "role": "adultLeader",
            "status": "active",
            "email": "leader1@example.com",
            "userId": "u1",
        }
    ]

    async def fake_query_items_paginated(*_args, **_kwargs):
        return stored_members, None

    async def fake_require_troop_context():
        return TroopContext(
            userId="admin-user",
            email="admin@example.com",
            displayName="Admin One",
            troopId="t1",
            role="troopAdmin",
        )

    monkeypatch.setattr(members_router, "query_items_paginated", fake_query_items_paginated)
    app.dependency_overrides[auth.require_troop_context] = fake_require_troop_context

    response = await client.get("/api/members")

    assert response.status_code == 200
    assert response.json() == {
        "items": stored_members,
        "continuationToken": None,
    }
