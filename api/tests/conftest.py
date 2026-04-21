from __future__ import annotations

import pytest


@pytest.fixture(autouse=True)
def set_feature_flag_defaults_for_tests(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("FEATURE_FLAGS_ENV", "beta")
    monkeypatch.setenv("FEATURE_FLAG_ENABLE_FEEDBACK", "true")
