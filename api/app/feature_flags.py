from __future__ import annotations

import logging
import os

logger = logging.getLogger(__name__)

FLAG_ENABLE_CONTENT_MODERATION = "enable-content-moderation"
FLAG_ENABLE_EMAIL_SHOPPING_LIST = "enable-email-shopping-list"
FLAG_ENABLE_SHARED_LINKS = "enable-shared-links"
FLAG_ENABLE_FEEDBACK = "enable-feedback"
FLAG_ENABLE_PRINT_RECIPES = "enable-print-recipes"

ALL_FEATURE_FLAGS = (
    FLAG_ENABLE_CONTENT_MODERATION,
    FLAG_ENABLE_EMAIL_SHOPPING_LIST,
    FLAG_ENABLE_SHARED_LINKS,
    FLAG_ENABLE_FEEDBACK,
    FLAG_ENABLE_PRINT_RECIPES,
)

_PRD_DEFAULTS_BY_ENV: dict[str, dict[str, bool]] = {
    "dev": {
        FLAG_ENABLE_CONTENT_MODERATION: False,
        FLAG_ENABLE_EMAIL_SHOPPING_LIST: False,
        FLAG_ENABLE_SHARED_LINKS: False,
        FLAG_ENABLE_FEEDBACK: False,
        FLAG_ENABLE_PRINT_RECIPES: True,
    },
    "beta": {
        FLAG_ENABLE_CONTENT_MODERATION: True,
        FLAG_ENABLE_EMAIL_SHOPPING_LIST: True,
        FLAG_ENABLE_SHARED_LINKS: True,
        FLAG_ENABLE_FEEDBACK: False,
        FLAG_ENABLE_PRINT_RECIPES: True,
    },
    "prod": {
        FLAG_ENABLE_CONTENT_MODERATION: True,
        FLAG_ENABLE_EMAIL_SHOPPING_LIST: True,
        FLAG_ENABLE_SHARED_LINKS: True,
        FLAG_ENABLE_FEEDBACK: False,
        FLAG_ENABLE_PRINT_RECIPES: True,
    },
}

_ENV_FLAG_NAME_BY_FLAG = {
    FLAG_ENABLE_CONTENT_MODERATION: "FEATURE_FLAG_ENABLE_CONTENT_MODERATION",
    FLAG_ENABLE_EMAIL_SHOPPING_LIST: "FEATURE_FLAG_ENABLE_EMAIL_SHOPPING_LIST",
    FLAG_ENABLE_SHARED_LINKS: "FEATURE_FLAG_ENABLE_SHARED_LINKS",
    FLAG_ENABLE_FEEDBACK: "FEATURE_FLAG_ENABLE_FEEDBACK",
    FLAG_ENABLE_PRINT_RECIPES: "FEATURE_FLAG_ENABLE_PRINT_RECIPES",
}

_logged_evaluations: set[tuple[str, bool, str]] = set()


def _normalize_environment(value: str | None) -> str:
    normalized = (value or "").strip().lower()
    if normalized in ("production", "prod", "prd"):
        return "prod"
    if normalized in ("development", "local"):
        return "dev"
    if normalized in ("", "test"):
        return "dev"
    if normalized in _PRD_DEFAULTS_BY_ENV:
        return normalized
    return "dev"


def _coerce_bool(value: str | None) -> bool | None:
    if value is None:
        return None
    normalized = value.strip().lower()
    if normalized in ("1", "true", "yes", "on"):
        return True
    if normalized in ("0", "false", "no", "off"):
        return False
    return None


def is_feature_enabled(flag_name: str) -> bool:
    if flag_name not in ALL_FEATURE_FLAGS:
        raise ValueError(f"Unknown feature flag: {flag_name}")

    override_name = _ENV_FLAG_NAME_BY_FLAG[flag_name]
    override_value = _coerce_bool(os.environ.get(override_name))
    source = f"env:{override_name}"
    if override_value is None:
        env = _normalize_environment(
            os.environ.get("FEATURE_FLAGS_ENV")
            or os.environ.get("APP_ENV")
            or os.environ.get("ENVIRONMENT")
        )
        override_value = _PRD_DEFAULTS_BY_ENV[env][flag_name]
        source = f"default:{env}"

    evaluation = (flag_name, override_value, source)
    if evaluation not in _logged_evaluations:
        logger.info("Feature flag evaluated: %s=%s (%s)", flag_name, override_value, source)
        _logged_evaluations.add(evaluation)

    return override_value
