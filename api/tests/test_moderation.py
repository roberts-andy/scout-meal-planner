from __future__ import annotations

import pytest

from app.middleware import moderation
from app.middleware.moderation import ModerationField


@pytest.mark.asyncio
async def test_moderate_text_fields_persists_categories_for_flagged_fields(monkeypatch: pytest.MonkeyPatch):
    async def fake_analyze_text(text: str) -> dict:
        if text == "flag me":
            return {"categoriesAnalysis": [{"category": "Hate", "severity": 4}, {"category": "Violence", "severity": 2}]}
        return {"categoriesAnalysis": [{"category": "Hate", "severity": 1}]}

    monkeypatch.setattr(moderation, "is_feature_enabled", lambda _flag: True)
    monkeypatch.setattr(moderation, "_analyze_text", fake_analyze_text)

    result = await moderation.moderate_text_fields([
        ModerationField(field="comments", text="flag me"),
        ModerationField(field="whatWorked", text="safe"),
    ])

    assert result.status == "flagged"
    assert result.flaggedFields == ["comments"]
    assert result.categories == [{"category": "Hate", "severity": 4}, {"category": "Violence", "severity": 2}]
    assert result.fieldCategories == [{
        "field": "comments",
        "categories": [{"category": "Hate", "severity": 4}, {"category": "Violence", "severity": 2}],
    }]
