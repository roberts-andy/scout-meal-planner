"""Tests for the E2E_TEST_MODE auth bypass in validate_token."""

from __future__ import annotations

import pytest
from starlette.requests import Request

import app.middleware.auth as auth_mod


def _make_request(auth_header: str | None = None) -> Request:
    """Build a minimal Starlette Request with optional Authorization header."""
    headers = []
    if auth_header:
        headers.append((b"authorization", auth_header.encode()))
    return Request({"type": "http", "method": "GET", "path": "/", "headers": headers})


@pytest.mark.asyncio
async def test_bypass_returns_synthetic_claims_when_enabled(monkeypatch):
    """With E2E_TEST_MODE=true, the sentinel token should return synthetic claims."""
    monkeypatch.setattr(auth_mod, "_E2E_TEST_MODE", True)

    claims = await auth_mod.validate_token(_make_request("Bearer e2e-test-token"))

    assert claims is not None
    assert claims.userId == "e2e-test-user"
    assert claims.email == "e2e@test.local"
    assert claims.displayName == "E2E Test User"


@pytest.mark.asyncio
async def test_bypass_disabled_rejects_sentinel_token(monkeypatch):
    """Without E2E_TEST_MODE, the sentinel token should NOT bypass validation."""
    monkeypatch.setattr(auth_mod, "_E2E_TEST_MODE", False)

    claims = await auth_mod.validate_token(_make_request("Bearer e2e-test-token"))

    # Without the bypass, the fake token fails real JWKS validation → None
    assert claims is None


@pytest.mark.asyncio
async def test_bypass_ignores_non_sentinel_tokens(monkeypatch):
    """Even with E2E_TEST_MODE=true, non-sentinel tokens go through real validation."""
    monkeypatch.setattr(auth_mod, "_E2E_TEST_MODE", True)

    claims = await auth_mod.validate_token(_make_request("Bearer some-random-token"))

    # Non-sentinel token fails real JWKS validation → None
    assert claims is None


@pytest.mark.asyncio
async def test_bypass_no_auth_header_still_returns_none(monkeypatch):
    """With E2E_TEST_MODE=true, missing auth header still returns None."""
    monkeypatch.setattr(auth_mod, "_E2E_TEST_MODE", True)

    claims = await auth_mod.validate_token(_make_request())

    assert claims is None
