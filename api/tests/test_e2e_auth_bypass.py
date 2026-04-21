"""Tests for the E2E_TEST_MODE auth bypass in validate_token."""

from __future__ import annotations

import importlib

import pytest
from starlette.testclient import TestClient


@pytest.fixture()
def _enable_e2e_mode(monkeypatch: pytest.MonkeyPatch):
    """Enable E2E test mode and reload the auth module to pick up the env var."""
    monkeypatch.setenv("E2E_TEST_MODE", "true")
    import app.middleware.auth as auth_mod
    importlib.reload(auth_mod)
    yield auth_mod
    # Restore original state
    monkeypatch.delenv("E2E_TEST_MODE", raising=False)
    importlib.reload(auth_mod)


@pytest.fixture()
def _disable_e2e_mode(monkeypatch: pytest.MonkeyPatch):
    """Ensure E2E test mode is disabled and reload the auth module."""
    monkeypatch.delenv("E2E_TEST_MODE", raising=False)
    import app.middleware.auth as auth_mod
    importlib.reload(auth_mod)
    yield auth_mod
    importlib.reload(auth_mod)


@pytest.mark.asyncio
async def test_bypass_returns_synthetic_claims_when_enabled(_enable_e2e_mode):
    """With E2E_TEST_MODE=true, the sentinel token should return synthetic claims."""
    from starlette.requests import Request

    auth_mod = _enable_e2e_mode
    scope = {"type": "http", "method": "GET", "path": "/", "headers": [
        (b"authorization", b"Bearer e2e-test-token"),
    ]}
    request = Request(scope)
    claims = await auth_mod.validate_token(request)

    assert claims is not None
    assert claims.userId == "e2e-test-user"
    assert claims.email == "e2e@test.local"
    assert claims.displayName == "E2E Test User"


@pytest.mark.asyncio
async def test_bypass_disabled_rejects_sentinel_token(_disable_e2e_mode):
    """Without E2E_TEST_MODE, the sentinel token should NOT bypass validation."""
    from starlette.requests import Request

    auth_mod = _disable_e2e_mode
    scope = {"type": "http", "method": "GET", "path": "/", "headers": [
        (b"authorization", b"Bearer e2e-test-token"),
    ]}
    request = Request(scope)
    claims = await auth_mod.validate_token(request)

    # Without the bypass, the fake token fails real JWKS validation → None
    assert claims is None


@pytest.mark.asyncio
async def test_bypass_ignores_non_sentinel_tokens(_enable_e2e_mode):
    """Even with E2E_TEST_MODE=true, non-sentinel tokens go through real validation."""
    from starlette.requests import Request

    auth_mod = _enable_e2e_mode
    scope = {"type": "http", "method": "GET", "path": "/", "headers": [
        (b"authorization", b"Bearer some-random-token"),
    ]}
    request = Request(scope)
    claims = await auth_mod.validate_token(request)

    # Non-sentinel token fails real JWKS validation → None
    assert claims is None


@pytest.mark.asyncio
async def test_bypass_no_auth_header_still_returns_none(_enable_e2e_mode):
    """With E2E_TEST_MODE=true, missing auth header still returns None."""
    from starlette.requests import Request

    auth_mod = _enable_e2e_mode
    scope = {"type": "http", "method": "GET", "path": "/", "headers": []}
    request = Request(scope)
    claims = await auth_mod.validate_token(request)

    assert claims is None
