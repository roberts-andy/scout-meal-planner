"""Auth middleware JWKS rotation and cache behavior tests."""

import pytest
from fastapi import HTTPException
from jose import JWTError

from app.middleware import auth


class MockRequest:
    def __init__(self, authorization: str | None):
        self.headers = {}
        if authorization:
            self.headers["authorization"] = authorization


@pytest.fixture(autouse=True)
def reset_auth_state(monkeypatch):
    monkeypatch.setattr(auth, "_jwks", None)
    monkeypatch.setattr(auth, "_jwks_fetched_at", None)
    monkeypatch.setattr(auth, "CLIENT_ID", "client-id")
    monkeypatch.setattr(auth, "JWKS_CACHE_TTL_SECONDS", 300)


@pytest.mark.asyncio
async def test_validate_token_retries_with_force_refresh_on_stale_keys(monkeypatch):
    stale_jwks = {"keys": [{"kid": "stale"}]}
    fresh_jwks = {"keys": [{"kid": "fresh"}]}
    calls: list[bool] = []

    async def fake_get_jwks(force_refresh: bool = False):
        calls.append(force_refresh)
        return fresh_jwks if force_refresh else stale_jwks

    def fake_decode(token, jwks, **_kwargs):
        if jwks["keys"][0]["kid"] == "stale":
            raise JWTError("stale keys")
        return {"sub": "user-123", "preferred_username": "user@example.com", "name": "User Name"}

    monkeypatch.setattr(auth, "_get_jwks", fake_get_jwks)
    monkeypatch.setattr(auth.jwt, "decode", fake_decode)

    claims = await auth.validate_token(MockRequest("Bearer token"))

    assert claims == auth.TokenClaims(
        userId="user-123",
        email="user@example.com",
        displayName="User Name",
    )
    assert calls == [False, True]


@pytest.mark.asyncio
async def test_get_jwks_cache_expires_after_ttl(monkeypatch):
    monkeypatch.setattr(auth, "JWKS_CACHE_TTL_SECONDS", 100)
    clock = [100.0]
    network_calls: list[str] = []

    class FakeResponse:
        def __init__(self, payload):
            self._payload = payload

        def raise_for_status(self):
            pass

        def json(self):
            return self._payload

    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return False

        async def get(self, url):
            network_calls.append(url)
            return FakeResponse({"keys": [{"kid": f"kid-{len(network_calls)}"}]})

    monkeypatch.setattr(auth.time, "monotonic", lambda: clock[0])
    monkeypatch.setattr(auth.httpx, "AsyncClient", lambda: FakeClient())

    first = await auth._get_jwks()
    clock[0] = 150.0
    second = await auth._get_jwks()
    clock[0] = 201.0
    third = await auth._get_jwks()

    assert first == second
    assert first != third
    assert len(network_calls) == 2


@pytest.mark.asyncio
async def test_require_token_returns_401_when_refresh_cannot_validate(monkeypatch):
    calls: list[bool] = []

    async def fake_get_jwks(force_refresh: bool = False):
        calls.append(force_refresh)
        return {"keys": [{"kid": "bad"}]}

    def fake_decode(*_args, **_kwargs):
        raise JWTError("invalid signature")

    monkeypatch.setattr(auth, "_get_jwks", fake_get_jwks)
    monkeypatch.setattr(auth.jwt, "decode", fake_decode)

    with pytest.raises(HTTPException) as exc:
        await auth.require_token(MockRequest("Bearer token"))

    assert exc.value.status_code == 401
    assert calls == [False, True]
