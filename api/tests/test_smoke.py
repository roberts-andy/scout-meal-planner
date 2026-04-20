"""Smoke tests for the FastAPI application."""
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.mark.asyncio
async def test_app_loads(client):
    """App object has registered routes."""
    assert len(app.routes) > 0


@pytest.mark.asyncio
async def test_health_endpoint(client):
    """Health endpoint returns 200."""
    response = await client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
