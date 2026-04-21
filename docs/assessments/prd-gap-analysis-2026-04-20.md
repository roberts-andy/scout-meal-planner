<!-- markdownlint-disable-file -->
<!-- markdown-table-prettify-ignore-start -->
# PRD Gap Analysis — 2026-04-20

Assessment of codebase implementation against [Scout Meal Planner MVP PRD v1.2](../prds/scout-meal-planner-mvp.md).

## Functional Requirements — Scorecard

**28 of 31 FRs fully implemented. 3 partial. 0 missing.**

### Event Management (FR-001–006)

| FR | Requirement | Status | Details |
|---|---|---|---|
| FR-001 | Create event (name, date range, departure/return time, headcount) | Partial | Name, date range, days implemented. **Missing**: departure time, return time, event-level headcount breakdown (scouts/adults/guests). `scoutCount` exists per-meal but no event-level headcount. |
| FR-002 | Trip logistics (camping type, power, water, trailer, hiking, altitude, weather) | Partial | `hike`, `highAltitude`, `tentCamping`, `cabinCamping` implemented. **Missing**: power availability, water source, trailer access, expected weather fields. |
| FR-003 | Meal scheduling (B/L/D/snacks per day) | Full | `MealType` enum covers breakfast/lunch/dinner/snack/other. `EventDay.meals` array per day. UI in `EventSchedule.tsx`. |
| FR-004 | Meal parameters (trailside, time-constrained flags) | Full | `isTrailside` and `isTimeConstrained` on `Meal` schema, exposed in add-meal UI. |
| FR-005 | Multi-course meals (multiple recipes per meal slot) | Partial | `MealCourse` enum (main/side/dessert/snack) exists. Multiple meals per day supported. Modeled as separate meal entries rather than linked courses within a single meal slot. |
| FR-006 | Dietary restrictions at meal level | Full | `dietaryNotes` field on `Meal` schema, exposed in UI. |

### Recipe Management (FR-007–012)

| FR | Requirement | Status | Details |
|---|---|---|---|
| FR-007 | Create recipe (name, ingredients w/ qty/unit, instructions, cooking method) | Full | `CreateRecipe` schema, `RecipeVariation` with cooking method/instructions, `Ingredient` with qty/unit. `CreateRecipeDialog.tsx` + API router. |
| FR-008 | Recipe equipment (pots, pans, utensils, supplemental items) | Full | `equipment: list[str]` on `RecipeVariation`. UI shows equipment. Supplemental items like spices covered via ingredient `notes` field. |
| FR-009 | Assign recipe to meal slot | Full | `recipeId` on `Meal` links to recipe. `selectedVariationId` selects cooking variation. UI in `EventSchedule.tsx`. |
| FR-010 | Recipe library (save/reuse across events) | Full | Recipes are troop-scoped, independent of events. `RecipeLibrary.tsx` component. `clonedFrom` supports forking. Version history with `RecipeVersion`. |
| FR-011 | Recipe scaling by headcount | Full | `scaleRecipe()` and `scaleIngredient()` in `recipeScaling.ts`. Shopping list uses `meal.scoutCount` to scale. |
| FR-012 | Print recipe in trip-ready format | Full | `handlePrint()` in `RecipeDetailDialog.tsx`, `@media print` CSS in `main.css` with `.recipe-print-root`, `.no-print` classes. |

### Shopping List (FR-013–016)

| FR | Requirement | Status | Details |
|---|---|---|---|
| FR-013 | Generate consolidated shopping list from recipes, scaled to headcount | Full | `generateShoppingList()` in `shoppingList.ts` consolidates/deduplicates ingredients, scales by `meal.scoutCount`. `categorizeIngredients()` groups by category. UI in `EventShoppingList.tsx`. |
| FR-014 | Estimated prices per item | Full | `estimatedPrice` on `Ingredient` schema. Price scales with quantity. UI shows per-item and total estimated cost with `formatPrice()`. |
| FR-015 | Email shopping list | Full | `POST /events/{id}/shopping-list/email` via Azure Communication Services. `EmailShoppingList` schema. UI dialog in `EventShoppingList.tsx`. HTML + plaintext email formatting. |
| FR-016 | Check off purchases (persisted state) | Full | `purchasedItems` on Event, `PATCH /events/{id}/purchased` with optimistic concurrency (etag). UI with checkboxes, server-persisted. |

### Equipment List (FR-017–018)

| FR | Requirement | Status | Details |
|---|---|---|---|
| FR-017 | Generate consolidated equipment list from recipes | Full | `getEquipmentList()` in `equipment.ts` aggregates equipment from selected variations. UI in `EventEquipment.tsx`. |
| FR-018 | Check off packed items (persisted state) | Full | `packedItems` on Event, `PATCH /events/{id}/packed` with optimistic concurrency (etag). UI with checkboxes, server-persisted. |

### Sharing (FR-019)

| FR | Requirement | Status | Details |
|---|---|---|---|
| FR-019 | Shareable read-only link (no login required) | Full | `share.py` router: generate/revoke share tokens. `share-tokens` Cosmos container for lookup. `SharedEventPage.tsx` renders read-only view. `staticwebapp.config.json` allows anonymous access to `/share/*`. |

### Feedback (FR-020–022)

| FR | Requirement | Status | Details |
|---|---|---|---|
| FR-020 | Submit meal feedback (rating, portion assessment, free-text) | Full | `CreateFeedback` schema with `FeedbackRating` (taste/difficulty/portionSize 1–5), `comments`, `whatWorked`, `whatToChange`, `scoutName`, `photos`. Full CRUD API. `EventFeedback.tsx` + `useFeedbackForm` hook. |
| FR-021 | Feedback on recipe detail (aggregated history) | Full | `GET /feedback/recipe/{id}` returns feedback with event names/dates. `calculateRecipeRatings()` computes averages. `useRecipeFeedback()` hook. Displayed in `RecipeDetailDialog.tsx`. |
| FR-022 | Anytime feedback (available after event ends) | Full | `canSubmitEventFeedback()` in `eventUtils.ts` enables feedback once `endDate` is reached. No expiry — available indefinitely after event ends. |

### Safety/Auth (FR-023–027)

| FR | Requirement | Status | Details |
|---|---|---|---|
| FR-023 | Content moderation for user-generated text | Full | Azure Content Safety integration in `moderation.py`. Applied to recipes (name + instructions) and feedback. Flags content exceeding severity threshold. Graceful degradation on timeout. |
| FR-024 | Youth PII minimization (first names only for youth) | Full | `_to_first_name()` in both `troops.py` and `members.py` strips to first name for scouts. `CreateMember` validator: email not required for scouts. Members list redacted for non-admins. |
| FR-025 | Admin content review (flagged content dashboard) | Full | `admin_flagged_content.py` router: `GET /admin/flagged-content`, `PUT /admin/flagged-content/{id}` with approve/reject/edit actions. `adminApi` client. Rendered in `TroopAdmin.tsx`. |
| FR-026 | Authentication via Entra ID (MSAL) | Full | `@azure/msal-react` + `@azure/msal-browser`. `useAuth()` hook with `acquireTokenSilent`/`acquireTokenPopup`. Uses `/consumers` endpoint with idToken. `AuthProvider.tsx` context. |
| FR-027 | Role-based access | Full | 5 roles: `troopAdmin`, `adultLeader`, `seniorPatrolLeader`, `patrolLeader`, `scout`. Permission matrix in `roles.py`. **Note**: PRD specifies 4 roles (Scoutmaster, Leader, Scout, Parent). Implementation adds SPL and Patrol Leader — richer than PRD. No separate Parent role (read-only via shared link). |

### Troop Admin (FR-028–031)

| FR | Requirement | Status | Details |
|---|---|---|---|
| FR-028 | Invite members (invite code + invite link) | Full | `_generate_invite_code()` creates `TROOP-XXXXXXXX` codes. `POST /troops/join` accepts invite code. `TroopOnboarding.tsx` supports URL-based join via `?code=` param. |
| FR-029 | Assign/change roles | Full | `PUT /members/{id}` with role update. Admin UI in `TroopAdmin.tsx` with role dropdown per member. Last-admin protection prevents removing sole troopAdmin. |
| FR-030 | Deactivate/remove members | Full | `UpdateTroopMemberStatus` schema validates `deactivated`/`removed`. `PATCH /troops/{troopId}/members/{id}` endpoint. UI confirmation dialog. |
| FR-031 | Delete member data (COPPA compliance) | Full | `DELETE /members/{id}/data` — anonymizes feedback audit fields, replaces `createdBy`/`updatedBy` with `"Deleted Member"`, deletes the member record. |

## Summary

| Category | Full | Partial | Missing |
|---|---|---|---|
| Event Management (FR-001–006) | 3 | 3 | 0 |
| Recipe Management (FR-007–012) | 6 | 0 | 0 |
| Shopping List (FR-013–016) | 4 | 0 | 0 |
| Equipment List (FR-017–018) | 2 | 0 | 0 |
| Sharing (FR-019) | 1 | 0 | 0 |
| Feedback (FR-020–022) | 3 | 0 | 0 |
| Safety/Auth (FR-023–027) | 5 | 0 | 0 |
| Troop Admin (FR-028–031) | 4 | 0 | 0 |
| **Totals** | **28** | **3** | **0** |

## Architecture & Design Divergences

### 1. Technology Stack — Major Divergence

The PRD appendix specifies "Azure Functions v4 (Node.js) API" but the actual deployed backend is **Python FastAPI**. A legacy Node.js scaffold still exists in `api/src/`. The Python FastAPI API is the authoritative backend. The Node.js code appears to be residual from an earlier scaffold and is not deployed.

**Status**: PRD updated to v1.3 to reflect the actual stack (2026-04-20).

### 2. UX Theme — Not Implemented

The PRD defines an outdoor/field-guide aesthetic with earth tones (Deep Forest Green, Warm Stone Gray, Deep Earth Brown, Campfire Orange) and Space Grotesk/Source Sans 3 fonts. The codebase uses generic shadcn/ui defaults (neutral grays). `theme.json` is empty. Radix color primitives (sage, olive, sand, brown, amber, green) are imported in `src/styles/theme.css` but not wired to the active CSS variables.

### 3. Feature Flags — Not Implemented

The PRD defines 5 feature flags with lifecycle rules. No flag evaluation code exists. All features are always on. `runtime.config.json` contains no flag definitions.

### 4. Application Insights — Not Instrumented

The PRD lists AppInsights as a Must dependency and the Prototype milestone gate includes "AppInsights instrumented." Zero references to Application Insights SDK in the codebase.

### 5. Role Model — Positive Divergence

The PRD specifies 4 roles; the implementation provides 5 (adds `seniorPatrolLeader` and `patrolLeader`). This is richer than specified.

## NFR Status

| NFR | Status | Notes |
|---|---|---|
| NFR-001/002 (Performance) | No data | No monitoring instrumented to measure |
| NFR-003 (Reliability) | Covered | Azure SWA SLA applies |
| NFR-005 (Auth) | Covered | JWT middleware active |
| NFR-006 (Content moderation) | Covered | Async-capable with graceful degradation |
| NFR-007 (Youth PII) | Covered | First-name stripping, PII redaction |
| NFR-008 (WCAG AA) | Unknown | Color palette not applied; no accessibility audit done |
| NFR-009 (TS strict mode) | Partial | `--noCheck` flag bypasses strict errors in build |
| NFR-010 (Test coverage) | Strong | 118 API tests, 116+ frontend tests, but no e2e smoke suite |
| NFR-011 (Mobile-first) | Unknown | No mobile testing evidence |

## Priority Recommendations

### Fix before Prototype milestone (May 2026)

1. Apply the outdoor/field-guide theme (CSS work, high visual impact)
2. Instrument Application Insights (prototype gate criterion)
3. Complete FR-001 — add departure/return time and event-level headcount breakdown
4. Complete FR-002 — add power, water, trailer, weather logistics fields

### Fix before Beta (Jul–Aug 2026)

5. Implement feature flag system
6. Fix TypeScript strict errors — remove `--noCheck`
7. Remove dead Node.js code in `api/src/`

### Fix before Launch (Sep 2026)

8. WCAG AA audit (once theme applied)
9. Add Playwright e2e smoke suite
10. Fix ESLint configuration (missing flat config for ESLint 9)
<!-- markdown-table-prettify-ignore-end -->
