"""Tests for health endpoint behavior."""
from unittest.mock import AsyncMock
from unittest.mock import Mock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.main import app
from app import main as main_module
from app.routers import health as health_router


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as async_client:
        yield async_client


@pytest.mark.asyncio
async def test_health_returns_healthy_when_db_connected(client, monkeypatch):
    check_database_connection = AsyncMock(return_value=None)
    monkeypatch.setattr(health_router, "check_database_connection", check_database_connection)

    response = await client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}
    check_database_connection.assert_awaited_once_with()


@pytest.mark.asyncio
async def test_health_returns_unhealthy_when_db_fails(client, monkeypatch):
    check_database_connection = AsyncMock(side_effect=RuntimeError("cosmos unavailable"))
    monkeypatch.setattr(health_router, "check_database_connection", check_database_connection)

    response = await client.get("/api/health")

    assert response.status_code == 503
    assert response.json() == {"status": "unhealthy"}


@pytest.mark.asyncio
async def test_health_request_emits_request_telemetry(client, monkeypatch):
    check_database_connection = AsyncMock(return_value=None)
    track_request = Mock()
    monkeypatch.setattr(health_router, "check_database_connection", check_database_connection)
    monkeypatch.setattr(main_module, "track_request", track_request)

    response = await client.get("/api/health")

    assert response.status_code == 200
    track_request.assert_called_once()
    kwargs = track_request.call_args.kwargs
    assert kwargs["name"] == "GET /api/health"
    assert kwargs["response_code"] == 200
    assert kwargs["success"] is True
