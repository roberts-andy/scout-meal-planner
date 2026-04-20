"""JWT rejection tests for auth middleware."""

import pytest
from fastapi import HTTPException, Request
from jose import ExpiredSignatureError, JWTError
from jose.exceptions import JWTClaimsError

from app.middleware import auth


def make_request(auth_header: str | None = None) -> Request:
    headers = []
    if auth_header is not None:
        headers.append((b"authorization", auth_header.encode("utf-8")))
    return Request({"type": "http", "method": "GET", "path": "/", "headers": headers})


@pytest.mark.asyncio
async def test_require_token_rejects_missing_token():
    with pytest.raises(HTTPException) as exc:
        await auth.require_token(make_request())

    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_require_token_rejects_wrong_authorization_scheme():
    with pytest.raises(HTTPException) as exc:
        await auth.require_token(make_request("Basic not-a-bearer-token"))

    assert exc.value.status_code == 401


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("header", "decode_error"),
    [
        ("Bearer garbage-token", JWTError("malformed token")),
        ("Bearer expired-token", ExpiredSignatureError("signature has expired")),
        ("Bearer wrong-audience-token", JWTClaimsError("invalid audience")),
        ("Bearer wrong-issuer-token", JWTClaimsError("invalid issuer")),
    ],
)
async def test_require_token_rejects_invalid_bearer_tokens(monkeypatch, header: str, decode_error: JWTError):
    async def fake_get_jwks(force_refresh: bool = False):
        return {"keys": []}

    def fake_decode(*_args, **_kwargs):
        raise decode_error

    monkeypatch.setattr(auth, "_get_jwks", fake_get_jwks)
    monkeypatch.setattr(auth.jwt, "decode", fake_decode)

    with pytest.raises(HTTPException) as exc:
        await auth.require_token(make_request(header))

    assert exc.value.status_code == 401
