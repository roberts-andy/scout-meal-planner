from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from typing import Literal

import httpx

logger = logging.getLogger(__name__)

ModerationStatus = Literal["approved", "flagged", "pending"]

API_VERSION = "2024-09-01"
DEFAULT_REQUEST_TIMEOUT_MS = 3000
DEFAULT_BLOCK_SEVERITY = 4


@dataclass
class ModerationResult:
    status: ModerationStatus
    flaggedFields: list[str] = field(default_factory=list)
    checkedAt: int = 0
    provider: str = "azure-content-safety"


@dataclass
class ModerationField:
    field: str
    text: str | None


def _get_block_severity_threshold() -> int:
    try:
        val = int(os.environ.get("CONTENT_SAFETY_BLOCK_SEVERITY", ""))
        return val if val >= 0 else DEFAULT_BLOCK_SEVERITY
    except (ValueError, TypeError):
        return DEFAULT_BLOCK_SEVERITY


def _get_request_timeout_s() -> float:
    try:
        val = int(os.environ.get("CONTENT_SAFETY_TIMEOUT_MS", ""))
        return val / 1000.0 if val >= 250 else DEFAULT_REQUEST_TIMEOUT_MS / 1000.0
    except (ValueError, TypeError):
        return DEFAULT_REQUEST_TIMEOUT_MS / 1000.0


def _get_max_severity(result: dict) -> int:
    categories = result.get("categoriesAnalysis", [])
    if not isinstance(categories, list):
        return 0
    max_sev = 0
    for cat in categories:
        sev = cat.get("severity", 0) or 0
        if isinstance(sev, (int, float)):
            max_sev = max(max_sev, int(sev))
    return max_sev


async def _analyze_text(text: str) -> dict:
    endpoint = os.environ.get("CONTENT_SAFETY_ENDPOINT")
    key = os.environ.get("CONTENT_SAFETY_KEY")
    if not endpoint or not key:
        raise RuntimeError("Content Safety not configured")

    url = f"{endpoint.rstrip('/')}/contentsafety/text:analyze?api-version={API_VERSION}"
    async with httpx.AsyncClient(timeout=_get_request_timeout_s()) as client:
        resp = await client.post(
            url,
            json={"text": text},
            headers={
                "Content-Type": "application/json",
                "Ocp-Apim-Subscription-Key": key,
            },
        )
        resp.raise_for_status()
        return resp.json()


async def moderate_text_fields(fields: list[ModerationField]) -> ModerationResult:
    import time

    entries = [
        {"field": f.field, "text": (f.text or "").strip()}
        for f in fields
        if f.text and f.text.strip()
    ]

    if not entries:
        return ModerationResult(status="approved", checkedAt=int(time.time() * 1000))

    threshold = _get_block_severity_threshold()

    try:
        results = []
        for entry in entries:
            analysis = await _analyze_text(entry["text"])
            results.append({"field": entry["field"], "maxSeverity": _get_max_severity(analysis)})

        flagged_fields = [r["field"] for r in results if r["maxSeverity"] >= threshold]

        return ModerationResult(
            status="flagged" if flagged_fields else "approved",
            flaggedFields=flagged_fields,
            checkedAt=int(time.time() * 1000),
        )
    except Exception as exc:
        field_names = ", ".join(e["field"] for e in entries)
        logger.warning(
            "Content moderation check failed for fields [%s] (%s); "
            "content will be stored with pending status.",
            field_names,
            str(exc),
        )
        return ModerationResult(status="pending", checkedAt=int(time.time() * 1000))


def can_view_moderated_content(role: str, moderation: dict | None) -> bool:
    if role == "troopAdmin":
        return True
    status = (moderation or {}).get("status", "approved")
    return status == "approved"
