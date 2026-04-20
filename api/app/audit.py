from __future__ import annotations

import time
from typing import Any


def _audit_actor(auth: Any) -> dict[str, str]:
    return {
        "userId": auth.userId,
        "displayName": auth.displayName,
        "email": auth.email,
    }


def audit_create(auth: Any) -> dict[str, Any]:
    now = int(time.time() * 1000)
    by = _audit_actor(auth)
    return {
        "createdAt": now,
        "createdBy": by,
        "updatedAt": now,
        "updatedBy": by,
    }


def audit_update(auth: Any) -> dict[str, Any]:
    return {
        "updatedAt": int(time.time() * 1000),
        "updatedBy": _audit_actor(auth),
    }
