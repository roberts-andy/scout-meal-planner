from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from typing import Literal

import httpx

from app.feature_flags import FLAG_ENABLE_CONTENT_MODERATION, is_feature_enabled

logger = logging.getLogger(__name__)

ModerationStatus = Literal["approved", "flagged", "pending"]

API_VERSION = "2024-09-01"
DEFAULT_REQUEST_TIMEOUT_MS = 3000
DEFAULT_BLOCK_SEVERITY = 4


@dataclass
class ModerationResult:
    status: ModerationStatus
    flaggedFields: list[str] = field(default_factory=list)
    categories: list[dict] = field(default_factory=list)
    fieldCategories: list[dict] = field(default_factory=list)
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
    categories = _extract_categories(result)
    max_sev = 0
    for cat in categories:
        sev = cat["severity"]
        max_sev = max(max_sev, sev)
    return max_sev


def _extract_categories(result: dict) -> list[dict]:
    categories = result.get("categoriesAnalysis", [])
    if not isinstance(categories, list):
        return []
    parsed: list[dict] = []
    for cat in categories:
        if not isinstance(cat, dict):
            continue
        category = cat.get("category")
        severity = cat.get("severity", 0)
        if isinstance(category, str) and isinstance(severity, (int, float)):
            parsed.append({
                "category": category,
                "severity": int(severity),
            })
    return parsed


def _aggregate_categories(field_results: list[dict]) -> list[dict]:
    max_by_category: dict[str, int] = {}
    for result in field_results:
        for category in result["categories"]:
            name = category["category"]
            severity = category["severity"]
            if name not in max_by_category or severity > max_by_category[name]:
                max_by_category[name] = severity
    return [
        {"category": name, "severity": severity}
        for name, severity in sorted(max_by_category.items(), key=lambda item: (-item[1], item[0]))
    ]


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

    if not is_feature_enabled(FLAG_ENABLE_CONTENT_MODERATION):
        return ModerationResult(
            status="approved",
            checkedAt=int(time.time() * 1000),
            provider="disabled",
        )

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
            categories = _extract_categories(analysis)
            results.append({
                "field": entry["field"],
                "categories": categories,
                "maxSeverity": _get_max_severity(analysis),
            })

        flagged_results = [r for r in results if r["maxSeverity"] >= threshold]
        flagged_fields = [r["field"] for r in flagged_results]

        return ModerationResult(
            status="flagged" if flagged_fields else "approved",
            flaggedFields=flagged_fields,
            categories=_aggregate_categories(flagged_results),
            fieldCategories=[
                {"field": result["field"], "categories": result["categories"]}
                for result in flagged_results
            ],
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
