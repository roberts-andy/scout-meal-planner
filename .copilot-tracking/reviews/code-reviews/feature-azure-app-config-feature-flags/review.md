# Code Review — `feature/azure-app-config-feature-flags`

| Field | Value |
|---|---|
| **Reviewer** | code-review-full |
| **Branch** | `feature/azure-app-config-feature-flags` |
| **Date** | 2026-04-21T16:22:58Z |
| **Severity Counts** | Critical: 1 · High: 2 · Medium: 4 · Low: 2 |

## Code / PR Summary

This branch integrates Azure App Configuration as a centralized feature flag source for the Scout Meal Planner API. It introduces a three-tier resolution hierarchy (env var → App Config → environment defaults), provisions the App Configuration store and seed flags via Bicep, wires managed identity RBAC, and adds unit tests covering the new resolution path.

---

## Changed Files Overview

| # | File | Risk Level | Issues |
|---|---|---|---|
| 1 | `api/app/feature_flags.py` | **High** | 4 |
| 2 | `api/app/main.py` | **High** | 1 |
| 3 | `api/requirements.txt` | Low | 0 |
| 4 | `api/tests/test_feature_flags.py` | Medium | 2 |
| 5 | `infra/main.bicep` | Low | 0 |
| 6 | `infra/parameters.json` | Low | 0 |
| 7 | `infra/resources.bicep` | **High** | 1 |

---

## Findings

### Critical

#### Issue 1: Feature flag lookup uses dict access on a list — App Configuration integration is non-functional [Functional]

**Category:** Contract
**File:** `api/app/feature_flags.py`, lines 92–94

`_resolve_from_app_config` accesses `feature_flags` with a string key (`flag_name`), but the `azure-appconfiguration-provider` SDK stores feature flags as a **list** of dicts, not a dict keyed by name. The SDK source confirms this — `processed_settings[FEATURE_MANAGEMENT_KEY][FEATURE_FLAG_KEY]` is always a `List[Dict]`, and the SDK's own test helper iterates the list to find a flag by `id`.

The string index on a list raises `TypeError`, which is silently caught by `except (KeyError, TypeError): return None`. This means **App Configuration flags are never used** — every lookup silently falls through to environment defaults. The feature is entirely broken with no indication of failure.

**Current code:**

```python
def _resolve_from_app_config(flag_name: str) -> bool | None:
    if _app_config_provider is None:
        return None
    try:
        ff = _app_config_provider["feature_management"]["feature_flags"][flag_name]
        return bool(ff.get("enabled", False))
    except (KeyError, TypeError):
        return None
```

**Suggested fix:**

```python
def _resolve_from_app_config(flag_name: str) -> bool | None:
    if _app_config_provider is None:
        return None
    try:
        feature_flags = _app_config_provider["feature_management"]["feature_flags"]
        for ff in feature_flags:
            if ff["id"] == flag_name:
                return bool(ff.get("enabled", False))
        return None
    except (KeyError, TypeError):
        return None
    except Exception:
        logger.warning("App Configuration lookup failed for %s", flag_name, exc_info=True)
        return None
```

---

### High

#### Issue 2: All seeded App Config flags are `enabled: false` — will disable production features when Issue 1 is fixed [Functional]

**Category:** Logic
**File:** `infra/resources.bicep`, lines 361–420

All five feature flags are seeded with `"enabled":false`. Once Issue 1 is fixed, App Config returns `false` for every flag, short-circuiting the environment defaults. Features currently enabled in production by default would be **silently disabled** on deployment.

| Flag | App Config Seed | Prod Default | Result After Fix |
|---|---|---|---|
| `enable-content-moderation` | `false` | `True` | **Disabled** (regression) |
| `enable-email-shopping-list` | `false` | `True` | **Disabled** (regression) |
| `enable-shared-links` | `false` | `True` | **Disabled** (regression) |
| `enable-feedback` | `false` | `False` | No change |
| `enable-print-recipes` | `false` | `True` | **Disabled** (regression) |

**Suggested fix:** Seed flags with values matching current production defaults (`true` for all except `enable-feedback`), or remove the seed resources so flags fall through to environment defaults until explicitly configured.

#### Issue 3: Unreachable duplicate `return None` in `_resolve_from_app_config` [Functional + Standards]

**Category:** Logic / Maintainability · **Skill:** python-foundational
**File:** `api/app/feature_flags.py`, lines 100–101

Both review agents identified this issue. The `except Exception` block ends with two consecutive `return None` statements. The second is unreachable dead code — a strong indicator of a missed merge or copy-paste bug that undermines confidence in the exception handler's correctness.

```python
    except Exception:
        logger.warning("App Configuration lookup failed for %s", flag_name, exc_info=True)
        return None
        return None   # ← unreachable
```

**Suggested fix:** Remove the duplicate `return None`.

---

### Medium

#### Issue 4: App Config provider not closed on shutdown — resource leak [Functional]

**Category:** Error Handling
**File:** `api/app/main.py`, lines 35–58

The lifespan context manager creates the `AzureAppConfigurationProvider` but never closes it during shutdown. When `feature_flag_refresh_enabled=True`, the provider may hold background resources for periodic change detection. The `finally` block only closes Cosmos DB clients. Additionally, `refresh()` is never called on the provider, so `feature_flag_refresh_enabled=True` has no effect — flags loaded at startup are never updated.

**Suggested fix:** Track `provider` as a local variable across the `yield` and call `provider.close()` in the `finally` block. Either add a refresh mechanism or remove `feature_flag_refresh_enabled=True` to avoid misleading configuration.

#### Issue 5: Missing type annotation on `init_app_config` parameter [Standards]

**Skill:** python-foundational · **Category:** §4 Type Safety Foundations
**File:** `api/app/feature_flags.py`, line 66

```python
def init_app_config(provider) -> None:
```

The `provider` parameter has no type annotation. All public API parameters should be typed.

**Suggested fix:** `def init_app_config(provider: Any) -> None:`

#### Issue 6: Module-level `_app_config_provider` lacks type annotation [Standards]

**Skill:** python-foundational · **Category:** §4 Type Safety Foundations
**File:** `api/app/feature_flags.py`, line 56

```python
_app_config_provider = None
```

**Suggested fix:** `_app_config_provider: Any = None`

#### Issue 7: Use of `global` keyword for provider singleton [Standards]

**Skill:** python-foundational · **Category:** §2 Pythonic Idioms
**File:** `api/app/feature_flags.py`, line 67

The skill states: "Never use `global`/`nonlocal` unless strictly required." A module-level dict (`_state = {"provider": None}`) avoids the `global` keyword while keeping the same pattern. Borderline acceptable given the module's simplicity.

---

### Low

#### Issue 8: Tests use a dict fake that masks the real SDK's list-based structure [Functional]

**Category:** Contract
**File:** `api/tests/test_feature_flags.py`, lines 189–244

`_FakeAppConfigProvider` stores feature flags as a nested dict keyed by flag name. The real SDK stores them as a list of dicts (each with `"id"` and `"enabled"` keys). All four tests pass because the fake matches the (incorrect) code in `_resolve_from_app_config`, validating the bug rather than the intended behavior.

**Suggested fix:** Update the fake to use `[{"id": "enable-feedback", "enabled": True}]` list-of-dicts structure, then fix `_resolve_from_app_config` to iterate.

#### Issue 9: Test imports private function `_resolve_from_app_config` [Standards]

**Skill:** python-foundational · **Category:** §3 Function & Class Design
**File:** `api/tests/test_feature_flags.py`, line 13

Importing `_resolve_from_app_config` creates coupling to an implementation detail. `test_resolve_returns_none_when_no_provider` could be expressed through the public `is_feature_enabled` API. Acceptable if direct unit testing of the private function is intentional.

---

## Positive Changes

- **Graceful degradation**: The startup `try/except` in `main.py` ensures the app starts even when App Configuration is unavailable, with a clear fallback path — matches the existing Cosmos DB error handling style.
- **Clean priority chain**: The three-tier precedence (env var → App Config → defaults) is well-structured and easy to follow.
- **Infrastructure RBAC**: The Bicep correctly provisions a managed identity role assignment (`App Configuration Data Reader`) rather than using connection strings.
- **Lazy imports**: Azure SDK imports inside the `if endpoint:` block avoid import-time failures when the SDK isn't installed locally.
- **Test isolation**: The `autouse` fixture that resets the provider between tests prevents cross-test contamination from the new global state.
- **Consistent Bicep patterns**: Role assignments and resource declarations follow the existing codebase style exactly.

## Testing Recommendations

1. **Update `_FakeAppConfigProvider`** to use the SDK's list-of-dicts structure and fix `_resolve_from_app_config` to iterate — highest priority gap.
2. **Add a test for the silent-failure path**: Verify that when `_resolve_from_app_config` encounters an unexpected provider structure, it logs a warning and falls through to defaults.
3. **Add an integration-style test** that validates the `lifespan` startup path with `APPCONFIG_ENDPOINT` set to a non-existent endpoint, confirming the fallback logs correctly.
4. **Add a test for `provider.close()`** cleanup once the lifespan is updated to close the provider.

## Recommended Actions

1. Fix the SDK contract mismatch (Issue 1) — this renders the entire feature non-functional.
2. Align seed flag values with production defaults (Issue 2) to prevent regressions.
3. Remove the dead code (Issue 3).
4. Close the provider on shutdown and decide on refresh strategy (Issue 4).
5. Add type annotations (Issues 5–6).

## Out-of-scope Observations

| # | File | Observation |
|---|---|---|
| A | `infra/resources.bicep` | `publicNetworkAccess: 'Enabled'` — required by free SKU. Consider restricting if upgraded to standard. |
| B | `infra/resources.bicep` | No diagnostic settings on the App Configuration store. Other resources send diagnostics to Log Analytics. |

## Risk Assessment

| Area | Risk |
|---|---|
| Feature Flag Resolution | **Critical** — SDK contract mismatch makes the feature entirely non-functional |
| Seed Values | **High** — All flags seeded as disabled will cause regressions once contract fix is applied |
| Startup | **Low** — Graceful fallback on App Config failure is well-handled |
| Infrastructure | **Low** — Free SKU with public access is acceptable for project scope |

## Verdict

❌ **Request changes**

The integration is architecturally sound but has a critical SDK contract mismatch (Issue 1) that makes the Azure App Configuration feature flag resolution entirely non-functional. All lookups silently fail and fall through to defaults. Additionally, the seed values (Issue 2) will cause production regressions once the contract is fixed, and the duplicate `return None` (Issue 3) suggests an incomplete edit. These must be resolved before merge.
