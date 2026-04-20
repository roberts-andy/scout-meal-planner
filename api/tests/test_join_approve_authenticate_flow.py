import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.middleware.auth import TokenClaims
from app.routers import members, troops
import app.middleware.auth as auth_middleware


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.mark.asyncio
async def test_join_approve_and_authenticate_flow(client, monkeypatch):
    troop = {"id": "troop-1", "name": "Troop 1", "inviteCode": "TROOP-ABCD"}
    member_records = [
        {
            "id": "leader-member-1",
            "troopId": "troop-1",
            "userId": "leader-user",
            "email": "leader@example.com",
            "displayName": "Leader",
            "role": "troopAdmin",
            "status": "active",
            "joinedAt": 1,
        }
    ]

    async def fake_validate_token(request):
        token = (request.headers.get("authorization") or "").replace("Bearer ", "")
        if token == "leader-token":
            return TokenClaims(userId="leader-user", email="leader@example.com", displayName="Leader Admin")
        if token == "scout-token":
            return TokenClaims(userId="scout-user", email="scout@example.com", displayName="Scout Person")
        return None

    async def fake_query_items(container_name, query, parameters=None):
        params = {item["name"]: item["value"] for item in (parameters or [])}

        if container_name == "troops":
            code = params.get("@code")
            return [troop] if troop["inviteCode"] == code else []

        if container_name != "members":
            return []

        if "@id" in params and "@troopId" in params:
            return [m for m in member_records if m["id"] == params["@id"] and m["troopId"] == params["@troopId"]]

        if "@troopId" in params and "@userId" in params:
            return [m for m in member_records if m["troopId"] == params["@troopId"] and m.get("userId") == params["@userId"]]

        if '@userId' in params and 'c.status = "active"' in query:
            return [m for m in member_records if m.get("userId") == params["@userId"] and m.get("status") == "active"]

        if '@email' in params and 'c.status = "active"' in query:
            return [
                m for m in member_records
                if m.get("email") == params["@email"] and m.get("status") == "active" and m.get("userId", "") == ""
            ]

        return []

    async def fake_create_item(container_name, item):
        if container_name == "members":
            member_records.append(item)
        return item

    async def fake_update_item(container_name, item_id, item, partition_key_value=None):
        if container_name == "members":
            for index, existing in enumerate(member_records):
                if existing["id"] == item_id and existing["troopId"] == partition_key_value:
                    member_records[index] = item
                    return item
        return item

    monkeypatch.setattr(auth_middleware, "validate_token", fake_validate_token)
    monkeypatch.setattr(auth_middleware, "query_items", fake_query_items)
    monkeypatch.setattr(auth_middleware, "update_item", fake_update_item)
    monkeypatch.setattr(troops, "query_items", fake_query_items)
    monkeypatch.setattr(troops, "create_item", fake_create_item)
    monkeypatch.setattr(members, "query_items", fake_query_items)
    monkeypatch.setattr(members, "update_item", fake_update_item)

    join_response = await client.post(
        "/api/troops/join",
        headers={"authorization": "Bearer scout-token"},
        json={"inviteCode": "TROOP-ABCD"},
    )
    assert join_response.status_code == 201
    joined_member = join_response.json()["member"]
    assert joined_member["userId"] == "scout-user"
    assert joined_member["email"] == "scout@example.com"
    assert joined_member["status"] == "pending"

    approve_response = await client.put(
        f'/api/members/{joined_member["id"]}',
        headers={"authorization": "Bearer leader-token"},
        json={"status": "active"},
    )
    assert approve_response.status_code == 200
    assert approve_response.json()["status"] == "active"

    me_response = await client.get(
        "/api/members/me",
        headers={"authorization": "Bearer scout-token"},
    )
    assert me_response.status_code == 200
    assert me_response.json() == {
        "troopId": troop["id"],
        "userId": "scout-user",
        "role": "scout",
    }
