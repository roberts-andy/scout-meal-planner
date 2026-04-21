"""Tests for global exception handlers in main.py."""

from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.cosmosdb import DatabaseUnavailableError
from app.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.asyncio
async def test_database_unavailable_returns_503():
    """When Cosmos DB isn't initialized, endpoints should return 503 not 500."""
    with patch("app.routers.members.get_troop_context", side_effect=DatabaseUnavailableError("members")):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.get("/api/members/me")
    assert resp.status_code == 503
    assert "database not ready" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_cosmos_http_error_returns_502():
    """Cosmos SDK errors should return 502 with a structured body."""
    from azure.cosmos.exceptions import CosmosHttpResponseError

    cosmos_err = CosmosHttpResponseError(status_code=500, message="Internal server error")
    with patch("app.routers.members.get_troop_context", side_effect=cosmos_err):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.get("/api/members/me")
    assert resp.status_code == 502
    assert resp.json()["detail"] == "Database operation failed"


@pytest.mark.asyncio
async def test_cosmos_429_returns_503():
    """Cosmos 429 (throttled) should return 503."""
    from azure.cosmos.exceptions import CosmosHttpResponseError

    cosmos_err = CosmosHttpResponseError(status_code=429, message="Request rate too large")
    with patch("app.routers.members.get_troop_context", side_effect=cosmos_err):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.get("/api/members/me")
    assert resp.status_code == 503
    assert "rate limited" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_feature_flags_unaffected_by_db_unavailable():
    """Feature flags endpoint should still work even if DB is down."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/feature-flags")
    assert resp.status_code == 200
