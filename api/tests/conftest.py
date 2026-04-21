from __future__ import annotations

import pytest

from app.middleware import auth as _auth_mod


@pytest.fixture(autouse=True)
def _block_jwks_network_calls(monkeypatch: pytest.MonkeyPatch):
    """Prevent every test from hitting login.microsoftonline.com for JWKS."""

    async def _fake_get_jwks(force_refresh: bool = False) -> dict:
        return {"keys": []}

    monkeypatch.setattr(_auth_mod, "_get_jwks", _fake_get_jwks)


@pytest.fixture(autouse=True)
def set_feature_flag_defaults_for_tests(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("FEATURE_FLAGS_ENV", "beta")
    monkeypatch.setenv("FEATURE_FLAG_ENABLE_FEEDBACK", "true")
