# Code Review — Scout Meal Planner (Full Codebase)

| Field | Value |
|-------|-------|
| **Reviewer** | code-review-full |
| **Branch** | main |
| **Date** | 2026-04-20T03:06:45Z |
| **Critical** | 2 | **High** | 5 | **Medium** | 8 | **Low** | 5 |

## Description

Full codebase review of the Scout Meal Planner application on `main`. The project is a React + Vite SPA frontend with a Python FastAPI backend, backed by Azure Cosmos DB and deployed as an Azure Static Web App. The codebase implements multi-tenant troop management, event/meal planning, recipe management with versioning, feedback collection, content moderation via Azure Content Safety, and a shared event link feature.

---

## Changed Files Overview

| File | Risk Level | Issues |
|------|-----------|--------|
| [api/app/middleware/auth.py](api/app/middleware/auth.py) | High | 2 |
| [api/app/routers/troops.py](api/app/routers/troops.py) | Critical | 3 |
| [api/app/routers/event_packed.py](api/app/routers/event_packed.py) | High | 1 |
| [api/app/routers/event_purchased.py](api/app/routers/event_purchased.py) | High | 1 |
| [api/app/routers/feedback.py](api/app/routers/feedback.py) | High | 3 |
| [api/app/routers/events.py](api/app/routers/events.py) | Medium | 2 |
| [api/app/routers/members.py](api/app/routers/members.py) | Medium | 2 |
| [api/app/middleware/moderation.py](api/app/middleware/moderation.py) | Medium | 1 |
| [api/app/routers/email_shopping_list.py](api/app/routers/email_shopping_list.py) | Medium | 1 |
| [api/app/routers/share.py](api/app/routers/share.py) | Medium | 2 |
| [api/app/cosmosdb.py](api/app/cosmosdb.py) | High | 1 |
| [api/app/main.py](api/app/main.py) | Medium | 1 |
| [api/app/routers/health.py](api/app/routers/health.py) | Low | 1 |
| [api/app/schemas.py](api/app/schemas.py) | Low | 1 |
| [src/lib/api.ts](src/lib/api.ts) | Low | 1 |
| [src/lib/authConfig.ts](src/lib/authConfig.ts) | Medium | 2 |
| [staticwebapp.config.json](staticwebapp.config.json) | Medium | 1 |

---

## Findings

### Critical

#### Issue 1: JWKS signing keys cached permanently — key rotation causes global auth outage [Functional] [Standards]

**Severity**: Critical  
**Category**: Error Handling  
**Skill**: python-foundational  
**File**: [api/app/middleware/auth.py](api/app/middleware/auth.py#L29-L36)

Both agents identified this issue. The `_jwks` dict is fetched once and cached in a module-level global forever. Microsoft rotates signing keys periodically (~every 6 weeks, sometimes on emergency notice). When keys rotate, all token validation fails, causing a total authentication outage requiring a process restart. There is also no lock protecting concurrent initialization.

**Current code:**
```python
_jwks: dict | None = None

async def _get_jwks() -> dict:
    global _jwks
    if _jwks is None:
        async with httpx.AsyncClient() as client:
            resp = await client.get(JWKS_URI)
            resp.raise_for_status()
            _jwks = resp.json()
    return _jwks
```

**Fix:** Add a TTL-based cache (e.g., 1 hour) and retry with a forced refresh on key-not-found errors:

```python
import time as _time

_jwks: dict | None = None
_jwks_fetched_at: float = 0
_JWKS_TTL_SECONDS = 3600

async def _get_jwks(force_refresh: bool = False) -> dict:
    global _jwks, _jwks_fetched_at
    now = _time.monotonic()
    if _jwks is None or force_refresh or (now - _jwks_fetched_at) > _JWKS_TTL_SECONDS:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(JWKS_URI)
            resp.raise_for_status()
            _jwks = resp.json()
            _jwks_fetched_at = now
    return _jwks
```

Also update `validate_token` to retry with `force_refresh=True` on `JWTError`.

---

#### Issue 2: Invite codes have only 65,536 possible values — brute-forceable without rate limiting [Functional] [Standards]

**Severity**: Critical (escalated from High — both agents flagged; troop membership grants access to all troop data)  
**Category**: Logic / Security  
**Skill**: python-foundational  
**File**: [api/app/routers/troops.py](api/app/routers/troops.py#L24-L25)

Both agents identified this issue. `secrets.token_hex(2).upper()[:4]` yields 4 hex characters = 16^4 = 65,536 possible codes. The `POST /troops/join` endpoint has no rate limiting. An attacker could enumerate all codes in minutes to join any troop, which is effectively an authorization bypass.

**Fix:** Increase to at least 8 characters and add rate limiting:
```python
def _generate_invite_code() -> str:
    return "TROOP-" + secrets.token_hex(4).upper()[:8]
```

---

### High

#### Issue 3: Troop join creates member without `userId` or `email` — user can never authenticate [Functional] [Standards]

**Severity**: High  
**Category**: Logic  
**Skill**: python-foundational  
**File**: [api/app/routers/troops.py](api/app/routers/troops.py#L92-L100)

Both agents identified this issue. When a user joins via invite code, the member document is created without `userId` or `email` fields. The auth middleware's `get_troop_context` searches by `userId` first, then falls back to email where `userId` is empty/undefined. Since neither field exists on the joined member record, the user will never be resolved to a troop context. The entire join-via-invite-code flow is broken.

**Fix:** Include identity fields:
```python
member = await create_item("members", {
    "id": str(uuid.uuid4()),
    "troopId": troop["id"],
    "userId": claims.userId,
    "email": claims.email,
    "displayName": _to_first_name(claims.displayName),
    "role": "scout",
    "status": "pending",
    "joinedAt": int(time.time() * 1000),
})
```

---

#### Issue 4: Race condition on packed/purchased item toggles — concurrent updates cause data loss [Functional]

**Severity**: High  
**Category**: Concurrency  
**File**: [api/app/routers/event_packed.py](api/app/routers/event_packed.py#L19-L42), [api/app/routers/event_purchased.py](api/app/routers/event_purchased.py#L19-L42)

Both toggle endpoints follow a read-modify-write pattern without optimistic concurrency. If two users toggle items simultaneously, the second write overwrites the first user's change. Cosmos DB's `replace_item` does not use ETags by default.

**Fix:** Add ETag-based optimistic concurrency to `update_item` in `cosmosdb.py` and retry on 412 Precondition Failed.

---

#### Issue 5: Any troop member can update another member's feedback (IDOR) [Functional]

**Severity**: High  
**Category**: Contract / Authorization  
**File**: [api/app/routers/feedback.py](api/app/routers/feedback.py#L42-L61)

`update_feedback` only checks `submitFeedback` permission (granted to all roles) and verifies the feedback belongs to the same troop. It does not verify the requesting user is the original author. Any troop member can modify any other member's feedback.

**Fix:** Add ownership check:
```python
created_by_user = (existing.get("createdBy") or {}).get("userId", "")
if created_by_user != auth.userId and not check_permission(auth.role, "manageEvents"):
    forbidden("You can only edit your own feedback")
```

---

#### Issue 6: Moderation "pending" content permanently invisible — not shown in admin dashboard [Functional]

**Severity**: High  
**Category**: Error Handling  
**File**: [api/app/middleware/moderation.py](api/app/middleware/moderation.py#L95-L108), [api/app/routers/admin_flagged_content.py](api/app/routers/admin_flagged_content.py#L82-L90)

When Azure Content Safety fails, content is stored with `status: "pending"`. The admin dashboard only lists `status == "flagged"` items. There is no retry mechanism. Content created during a Content Safety outage is permanently invisible to all workflows.

**Fix:** Include `"pending"` status in the admin flagged content listing.

---

#### Issue 7: Hardcoded PII in seed data committed to source [Standards]

**Severity**: High  
**Category**: Anti-Patterns  
**Skill**: python-foundational  
**File**: [api/app/cosmosdb.py](api/app/cosmosdb.py#L54-L66)

`_SEED_MEMBERS` contains a real email address and name. This is PII in source control, visible to anyone with repo access.

**Fix:** Use placeholder data (e.g., `admin@example.com`, `"Seed Admin"`) or load from environment variables.

---

### Medium

#### Issue 8: Inconsistent error response patterns across routers [Standards]

**Severity**: Medium  
**Category**: Error Handling / Architectural Fit  
**Skill**: python-foundational  
**Files**: [api/app/routers/events.py](api/app/routers/events.py#L33), [api/app/routers/members.py](api/app/routers/members.py#L79), [api/app/routers/share.py](api/app/routers/share.py#L41)

Some endpoints return `JSONResponse({"error": "..."})` while others `raise HTTPException(detail="...")`. The frontend `api.ts` parses `body.error` but `HTTPException` returns `{"detail": "..."}`. Some 404s show a message; others show "Request failed with HTTP 404."

**Fix:** Standardize on `HTTPException` (idiomatic FastAPI) and update the frontend error parser to check `body.detail` as well.

---

#### Issue 9: Event PUT overwrites packed/purchased state when client omits those fields [Functional]

**Severity**: Medium  
**Category**: Contract  
**File**: [api/app/routers/events.py](api/app/routers/events.py#L52-L66)

Pydantic's `model_dump()` includes `None` for optional fields not provided by the client. The merge `{**existing, **body.model_dump()}` overwrites existing lists with `None`, silently deleting packed/purchased tracking state.

**Fix:** Use `body.model_dump(exclude_none=True)` or explicitly preserve server-managed fields.

---

#### Issue 10: Deleting an event orphans all associated feedback records [Functional]

**Severity**: Medium  
**Category**: Edge Cases  
**File**: [api/app/routers/events.py](api/app/routers/events.py#L68-L73)

`delete_event` removes the event document but does not cascade-delete associated feedback records.

**Fix:** Query and delete associated feedback before deleting the event.

---

#### Issue 11: Members endpoint exposes all emails to every troop member including scouts [Functional]

**Severity**: Medium  
**Category**: Privacy  
**File**: [api/app/routers/members.py](api/app/routers/members.py#L43-L50)

`GET /members` returns full member records (including `email`, `userId`) to any authenticated troop member. For a youth organization, exposing adult email addresses to scouts is a privacy concern.

**Fix:** Strip PII for non-admin users — return only `id`, `displayName`, `role`, `status`.

---

#### Issue 12: Email subject line not sanitized — potential header injection [Functional]

**Severity**: Medium  
**Category**: Edge Cases  
**File**: [api/app/routers/email_shopping_list.py](api/app/routers/email_shopping_list.py#L66-L67)

Event name (user-controlled) is interpolated into the email subject without stripping newlines.

**Fix:** `safe_name = (event_name).replace("\n", " ").replace("\r", " ")[:200]`

---

#### Issue 13: Missing `Content-Security-Policy` header [Functional] [Standards]

**Severity**: Medium  
**Category**: Security  
**File**: [staticwebapp.config.json](staticwebapp.config.json#L8-L13)

Both agents identified this. Security headers are present but CSP — the primary XSS mitigation — is missing.

**Fix:** Add a CSP restricting `script-src`, `style-src`, and `connect-src` to known origins.

---

#### Issue 14: MSAL verbose logging enabled unconditionally in production [Standards]

**Severity**: Medium  
**Category**: Engineering Fundamentals  
**File**: [src/lib/authConfig.ts](src/lib/authConfig.ts#L18)

`logLevel: LogLevel.Verbose` logs all MSAL interactions to the browser console in production.

**Fix:** `logLevel: import.meta.env.DEV ? LogLevel.Verbose : LogLevel.Warning`

---

#### Issue 15: `localStorage` used for MSAL token cache [Standards]

**Severity**: Medium  
**Category**: Security  
**Skill**: Engineering Fundamentals  
**File**: [src/lib/authConfig.ts](src/lib/authConfig.ts#L12)

`cacheLocation: 'localStorage'` makes tokens accessible to any JS on the page. If an XSS vulnerability exists (especially without CSP), tokens could be exfiltrated.

**Fix:** Switch to `sessionStorage` or accept the trade-off with a proper CSP.

---

### Low

#### Issue 16: Frontend passes unused `eventId` query parameter on feedback delete [Functional]

**Severity**: Low  
**Category**: Contract  
**File**: [src/lib/api.ts](src/lib/api.ts#L107-L108)

The frontend sends `DELETE /feedback/{id}?eventId={eventId}`, but the backend doesn't use this parameter.

---

#### Issue 17: Health endpoint triggers full database initialization [Functional] [Standards]

**Severity**: Low  
**Category**: Logic  
**File**: [api/app/routers/health.py](api/app/routers/health.py#L9-L14)

Health probe calls `init_database()` which creates containers and seeds data. A health check should verify connectivity without side effects.

---

#### Issue 18: Feedback delete requires `manageEvents` permission — inconsistent with CRUD pattern [Functional]

**Severity**: Low  
**Category**: Contract  
**File**: [api/app/routers/feedback.py](api/app/routers/feedback.py#L63-L67)

Create/update require `submitFeedback`, but delete requires `manageEvents`. A scout who created feedback cannot delete it.

---

#### Issue 19: Module-level imports inside function bodies [Standards]

**Severity**: Low  
**Category**: Readability & Style  
**Skill**: python-foundational  
**Files**: [api/app/routers/members.py](api/app/routers/members.py#L79), [api/app/routers/share.py](api/app/routers/share.py#L41)

`from fastapi import HTTPException` appears inside multiple function bodies (~6 occurrences) instead of at module level.

---

#### Issue 20: `UpdateEvent = CreateEvent` aliases may hide diverging semantics [Standards]

**Severity**: Low  
**Category**: Architectural Fit  
**Skill**: python-foundational  
**File**: [api/app/schemas.py](api/app/schemas.py#L139)

Update schemas are simple aliases of create schemas. If update semantics ever diverge, callers silently break.

---

## Positive Changes

- **Solid RBAC design**: Clean role hierarchy and permission matrix in `roles.py` consistently applied across all endpoints
- **Parameterized queries throughout**: All Cosmos DB queries use parameterized values — no NoSQL injection risk
- **Content moderation pipeline**: Azure Content Safety integration with graceful degradation (pending status on failure)
- **HTML escaping in email**: `html.escape()` properly used for all user-controlled values in HTML email body
- **Troop isolation**: Every data-access endpoint correctly scopes queries by `auth.troopId`
- **Data deletion/anonymization**: `delete_member_data` implements proper PII anonymization with audit trail replacement — good privacy hygiene
- **Pydantic validation**: Thorough input validation with `Field(min_length=...)`, `EmailStr`, custom `model_validator` decorators
- **Share token entropy**: 256 bits of randomness for shared event links
- **Frontend optimistic updates**: TanStack Query mutations with proper rollback on error (EventShoppingList)
- **Security headers**: Good baseline with `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, etc.

## Testing Recommendations

1. **Integration test for join-troop → approve → authenticate flow** (Issue 3) — currently broken
2. **JWKS key rotation test** — mock `_get_jwks` to return stale keys and verify retry logic
3. **Concurrent toggle test** — fire 10 parallel `PATCH /events/{id}/packed` requests and verify all persist
4. **Feedback ownership test** — verify a scout cannot `PUT /feedback/{id}` for feedback created by a different scout
5. **Moderation failure test** — mock Content Safety to fail and verify pending content appears in admin dashboard
6. **RBAC enforcement tests** — verify each endpoint rejects insufficient roles
7. **Cross-troop isolation test** — verify a user in troop A cannot access troop B's data
8. **Event delete cascade test** — delete an event and verify associated feedback is cleaned up

## Recommended Actions

**Priority remediation order:**
1. Add JWKS TTL/refresh (Issue 1)
2. Increase invite code entropy + add rate limiting (Issue 2)
3. Fix `join_troop` missing identity fields (Issue 3)
4. Remove hardcoded PII from seed data (Issue 7)
5. Add feedback ownership check (Issue 5)
6. Include "pending" items in admin flagged content dashboard (Issue 6)
7. Standardize error response format (Issue 8)
8. Add unit tests for auth, RBAC, and data isolation

## Out-of-scope Observations

| File | Observation |
|------|-------------|
| All routers | Duplicated timestamp/audit boilerplate (`int(time.time() * 1000)`, audit dicts) — extract shared helpers |
| `api/app/routers/share.py` | Cross-partition query for `shareToken` lookup — expensive in Cosmos DB at scale |
| All list endpoints | No pagination — unbounded responses will degrade as data grows |
| `api/app/main.py` | No CORS middleware — fine for SWA proxy but blocks local dev or direct API access |
| `api/app/routers/share.py` | Share token uses `uuid4().hex` instead of `secrets` — works but not idiomatic for security tokens |
| `api/app/middleware/auth.py` | `forbidden()` and `unauthorized()` lack `NoReturn` type annotation |
| `api/app/routers/feedback.py` | `dataclass.__dict__` used instead of `dataclasses.asdict()` for `ModerationResult` |

## Risk Assessment

| Area | Risk Level |
|------|-----------|
| Authentication / Authorization | **High** — JWKS never refreshes; invite codes are brute-forceable; join flow broken |
| Data Isolation | **Medium** — Troop-scoping is consistent but lacks test coverage |
| Error Handling | **Medium** — Inconsistent response patterns across routers |
| Frontend Security | **Medium** — Verbose auth logging in production; localStorage tokens; no CSP |
| Performance | **Medium** — No pagination; cross-partition queries on shared links |

## Missing Test Coverage

| Critical Path | Current Coverage | Risk |
|---|---|---|
| JWT validation & token rejection | None (`test_smoke.py` only) | **High** |
| RBAC permission enforcement | None | **High** |
| Troop data isolation (cross-tenant access) | None | **High** |
| Content moderation flow | None | **Medium** |
| Member data deletion/anonymization | None | **Medium** |
| Frontend error boundary / auth error states | None | **Low** |

## Verdict

❌ **Request changes** — 2 Critical findings (JWKS cache never refreshes; invite codes trivially brute-forceable) and 5 High findings (broken join flow, race conditions, IDOR on feedback, invisible pending content, hardcoded PII) require resolution before this codebase is production-ready.
