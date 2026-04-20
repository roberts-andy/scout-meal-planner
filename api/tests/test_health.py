"""Tests for health endpoint behavior."""
from unittest.mock import AsyncMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.routers import health as health_router


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as async_client:
        yield async_client


@pytest.mark.asyncio
async def test_health_endpoint_uses_lightweight_connectivity_check(client, monkeypatch):
    check_database_connection = AsyncMock(return_value=None)
    monkeypatch.setattr(health_router, "check_database_connection", check_database_connection)

    response = await client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}
    check_database_connection.assert_awaited_once_with()


@pytest.mark.asyncio
async def test_health_endpoint_returns_unhealthy_when_connectivity_check_fails(client, monkeypatch):
    check_database_connection = AsyncMock(side_effect=RuntimeError("cosmos unavailable"))
    monkeypatch.setattr(health_router, "check_database_connection", check_database_connection)

    response = await client.get("/api/health")

    assert response.status_code == 503
    assert response.json() == {"status": "unhealthy"}
