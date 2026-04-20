import pytest
from jose import JWTError
from starlette.requests import Request

from app.middleware import auth


def _make_request(auth_header: str | None = None) -> Request:
    headers = []
    if auth_header is not None:
        headers.append((b"authorization", auth_header.encode("utf-8")))
    return Request({"type": "http", "headers": headers})


@pytest.mark.asyncio
async def test_validate_token_retries_with_forced_jwks_refresh(monkeypatch):
    calls: list[bool] = []
    stale_jwks = {"keys": ["stale"]}
    fresh_jwks = {"keys": ["fresh"]}

    async def fake_get_jwks(force_refresh: bool = False):
        calls.append(force_refresh)
        return fresh_jwks if force_refresh else stale_jwks

    decode_calls = 0

    def fake_decode(token, jwks, algorithms, audience, issuer):  # noqa: ANN001
        nonlocal decode_calls
        decode_calls += 1
        if jwks == stale_jwks:
            raise JWTError("stale key")
        return {"sub": "user-123", "preferred_username": "user@example.com", "name": "User"}

    monkeypatch.setattr(auth, "_get_jwks", fake_get_jwks)
    monkeypatch.setattr(auth.jwt, "decode", fake_decode)

    claims = await auth.validate_token(_make_request("Bearer valid-token"))

    assert claims is not None
    assert claims.userId == "user-123"
    assert claims.email == "user@example.com"
    assert claims.displayName == "User"
    assert decode_calls == 2
    assert calls == [False, True]


@pytest.mark.asyncio
async def test_get_jwks_cache_expires_after_ttl(monkeypatch):
    requested_urls: list[str] = []
    timeout_values: list[int] = []
    fetch_count = 0
    monotonic_values = iter([0.0, 0.0, 10.0, 3700.0, 3700.0])

    class FakeResponse:
        def __init__(self, payload):
            self._payload = payload

        def raise_for_status(self):
            return None

        def json(self):
            return self._payload

    class FakeAsyncClient:
        def __init__(self, *, timeout):
            timeout_values.append(timeout)

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, url: str):
            nonlocal fetch_count
            fetch_count += 1
            requested_urls.append(url)
            return FakeResponse({"keys": [f"key-{fetch_count}"]})

    monkeypatch.setattr(auth, "_jwks", None)
    monkeypatch.setattr(auth, "_jwks_fetched_at", 0.0)
    monkeypatch.setattr(auth._time, "monotonic", lambda: next(monotonic_values, 3700.0))
    monkeypatch.setattr(auth.httpx, "AsyncClient", FakeAsyncClient)

    first = await auth._get_jwks()
    second = await auth._get_jwks()
    third = await auth._get_jwks()

    assert first == {"keys": ["key-1"]}
    assert second == {"keys": ["key-1"]}
    assert third == {"keys": ["key-2"]}
    assert requested_urls == [auth.JWKS_URI, auth.JWKS_URI]
    assert timeout_values == [10, 10]
