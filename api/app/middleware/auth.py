from __future__ import annotations

import asyncio
import logging
import os
import time as _time
from dataclasses import dataclass
from typing import Annotated

import httpx
from fastapi import Depends, HTTPException, Request
from jose import JWTError, jwt

from app.cosmosdb import query_items, update_item

logger = logging.getLogger(__name__)

CLIENT_ID = os.environ.get("ENTRA_CLIENT_ID")

if not CLIENT_ID:
    logger.warning("ENTRA_CLIENT_ID not set — auth will reject all requests")

# Microsoft identity platform /consumers endpoint
JWKS_URI = "https://login.microsoftonline.com/consumers/discovery/v2.0/keys"
ISSUER = "https://login.microsoftonline.com/9188040d-6c67-4c5b-b112-36a304b66dad/v2.0"


def _get_jwks_cache_ttl_seconds() -> int:
    value = os.environ.get("JWKS_CACHE_TTL_SECONDS", "300")
    try:
        return int(value)
    except ValueError:
        logger.warning("Invalid JWKS_CACHE_TTL_SECONDS value %r; defaulting to 300", value)
        return 300


JWKS_CACHE_TTL_SECONDS = _get_jwks_cache_ttl_seconds()

_jwks: dict | None = None
_jwks_fetched_at: float = 0
_JWKS_HTTP_TIMEOUT_SECONDS = 10
_jwks_lock = asyncio.Lock()


async def _get_jwks(force_refresh: bool = False) -> dict:
    global _jwks, _jwks_fetched_at
    now = _time.monotonic()
    if _jwks is not None and not force_refresh and (now - _jwks_fetched_at) <= JWKS_CACHE_TTL_SECONDS:
        return _jwks

    async with _jwks_lock:
        now = _time.monotonic()
        if _jwks is None or force_refresh or (now - _jwks_fetched_at) > JWKS_CACHE_TTL_SECONDS:
            async with httpx.AsyncClient(timeout=_JWKS_HTTP_TIMEOUT_SECONDS) as client:
                resp = await client.get(JWKS_URI)
                resp.raise_for_status()
                _jwks = resp.json()
                _jwks_fetched_at = now
    return _jwks


def _decode_and_build_claims(token: str, jwks: dict) -> TokenClaims:
    payload = jwt.decode(
        token,
        jwks,
        algorithms=["RS256"],
        audience=CLIENT_ID,
        issuer=ISSUER,
    )
    return TokenClaims(
        userId=payload.get("sub") or payload.get("oid", ""),
        email=_extract_email(payload),
        displayName=payload.get("name", ""),
    )


def _extract_email(payload: dict) -> str:
    # Fallback order: first value in `emails`, then `preferred_username`
    emails = payload.get("emails")
    return (emails[0] if emails else None) or payload.get("preferred_username", "")


@dataclass
class TokenClaims:
    userId: str
    email: str
    displayName: str


@dataclass
class TroopContext:
    userId: str
    email: str
    displayName: str
    troopId: str
    role: str


async def validate_token(request: Request) -> TokenClaims | None:
    auth_header = request.headers.get("authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    token = auth_header[7:]

    try:
        return _decode_and_build_claims(token, await _get_jwks())
    except JWTError:
        try:
            return _decode_and_build_claims(token, await _get_jwks(force_refresh=True))
        except JWTError:
            return None


async def get_troop_context(request: Request) -> TroopContext | None:
    claims = await validate_token(request)
    if not claims:
        return None

    members = await query_items(
        "members",
        'SELECT * FROM c WHERE c.userId = @userId AND c.status = "active"',
        [{"name": "@userId", "value": claims.userId}],
    )

    member = members[0] if members else None

    # Fallback: match by email for seeded members whose userId hasn't been set yet
    if not member and claims.email:
        by_email = await query_items(
            "members",
            'SELECT * FROM c WHERE c.email = @email AND c.status = "active" AND (c.userId = "" OR NOT IS_DEFINED(c.userId))',
            [{"name": "@email", "value": claims.email}],
        )
        if by_email:
            member = by_email[0]
            member["userId"] = claims.userId
            member["displayName"] = claims.displayName or member.get("displayName", "")
            await update_item("members", member["id"], member, member["troopId"])

    if not member:
        return None

    return TroopContext(
        userId=claims.userId,
        email=claims.email,
        displayName=claims.displayName,
        troopId=member["troopId"],
        role=member["role"],
    )


def unauthorized(message: str = "Authentication required"):
    raise HTTPException(status_code=401, detail=message)


def forbidden(message: str = "Insufficient permissions"):
    raise HTTPException(status_code=403, detail=message)


# FastAPI dependency: require valid token
async def require_token(request: Request) -> TokenClaims:
    claims = await validate_token(request)
    if not claims:
        unauthorized()
    return claims  # type: ignore[return-value]


# FastAPI dependency: require troop membership
async def require_troop_context(request: Request) -> TroopContext:
    ctx = await get_troop_context(request)
    if not ctx:
        unauthorized()
    return ctx  # type: ignore[return-value]


# Annotated types for dependency injection
RequireToken = Annotated[TokenClaims, Depends(require_token)]
RequireTroopContext = Annotated[TroopContext, Depends(require_troop_context)]
