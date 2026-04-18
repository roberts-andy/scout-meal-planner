# Squad Decisions

## Active Decisions

### Triage Report: 18 Open Issues (Scout Meal Planner)

**Triaged by:** Mikey  
**Date:** 2026-01-29  
**Total Issues:** 18 non-epic issues (Epics #32-37 skipped per instructions)

#### Triage Summary Table

| # | Title | Owner | Priority | Complexity | Status | Dependencies | Notes |
|---|-------|-------|----------|-----------|--------|--------------|-------|
| 59 | FR-030: Deactivate or remove members | **Mouth** | MUST | Medium | Missing | #58 | Full-stack (API PATCH + UI); depends on status field first |
| 58 | FR-029: Assign roles - add deactivated status | **Mouth** | MUST | Medium | Partial | None | Backend: add status enum to schema, auth middleware check |
| 57 | FR-028: Invite members - add invite link support | **Data** | MUST | Simple | Partial | None | Frontend only: display link, copy-to-clipboard button |
| 56 | FR-031: Delete member data (COPPA deletion) | **Mouth** | MUST | Complex | Missing | None | Backend: delete from multiple containers, audit trail |
| 55 | FR-025: Admin content review dashboard | **Data** | MUST | Medium | Missing | #53 | Frontend: UI for flagged content review; depends on moderation |
| 54 | FR-024: Youth PII minimization audit | **Mouth** | MUST | Medium | Missing | None | Backend: audit code paths, remove excess PII collection |
| 53 | FR-023: Content moderation (Azure Content Safety) | **Mouth** | MUST | Complex | Missing | None | Backend: integrate Content Safety API, flag content |
| 52 | FR-022: Anytime feedback (time-gated) | **Data** | MUST | Simple | Missing | None | Frontend: date comparison logic in EventDetail |
| 51 | FR-021: Feedback visible on recipe detail | **Mouth** | MUST | Medium | Missing | None | Backend: add feedback query endpoint; Frontend: display aggregated |
| 50 | FR-019: Shareable read-only link to event plan | **Data** | MUST | Complex | Missing | None | Full-stack: share token, public API endpoint, unauthenticated route |
| 49 | FR-012: Print recipe in trip-ready format | **Data** | MUST | Simple | Missing | None | Frontend only: print CSS, print button, scaled quantities |
| 48 | FR-018: Check off packed equipment (add checkbox UI) | **Data** | SHOULD | Simple | Partial | None | Frontend: checkbox UI; Backend: persist state (likely paired with #47) |
| 47 | FR-016: Check off purchases (persist state) | **Data** | SHOULD | Simple | Partial | None | Frontend: checkbox UI; Backend: persist state (likely paired with #48) |
| 44 | FR-015: Email shopping list | **Mouth** | MUST | Medium | Missing | None | Backend: email service integration (ACS/SendGrid), template |
| 42 | FR-014: Estimated prices on shopping list | **Data** | SHOULD | Simple | Missing | None | Frontend: display prices; Backend: schema supports optional price |
| 40 | FR-006: Dietary restrictions at meal level | **Data** | MUST | Simple | Missing | None | Frontend: text input; Backend: add dietaryNotes field to meal |
| 39 | FR-005: Multi-course meals (complete partial) | **Data** | SHOULD | Medium | Partial | None | Frontend: course labels on meal assignments; Backend: add course enum |
| 38 | FR-004: Meal parameters (trailside / time-constrained) | **Data** | SHOULD | Simple | Missing | None | Frontend: toggle controls; Backend: add boolean flags to meal schema |

#### Recommended Work Order

**Phase 1: Foundation (Security & Admin)** — MUST Priority, No Dependencies
1. **#58** (FR-029): Add deactivated status field — Backend prerequisite for member management
2. **#54** (FR-024): Youth PII minimization audit — Compliance & data hygiene
3. **#53** (FR-023): Content moderation (Azure Content Safety) — Blocks feedback feature activation
4. **#58** → **#59** (FR-030): Deactivate or remove members — Sequential

**Phase 2: Core Features (Meal Planning)** — MUST Priority, Low Coupling
5. **#40** (FR-006): Dietary restrictions at meal level — Simple, isolated
6. **#52** (FR-022): Anytime feedback (time-gated) — Simple, frontend-only
7. **#49** (FR-012): Print recipe in trip-ready format — Simple, frontend CSS

**Phase 3: Sharing & Communication** — MUST Priority, Medium Complexity
8. **#51** (FR-021): Feedback visible on recipe detail — Depends on feedback infrastructure
9. **#55** (FR-025): Admin content review dashboard — Depends on #53 (moderation)
10. **#50** (FR-019): Shareable read-only link to event plan — Complex, full-stack
11. **#44** (FR-015): Email shopping list — Medium complexity, email service integration

**Phase 4: Administration (Member Management)** — MUST Priority
12. **#56** (FR-031): Delete member data (COPPA deletion) — Complex, audit trail required
13. **#57** (FR-028): Invite members - add invite link support — Simple, UI only

**Phase 5: Polish (Should-Have)** — SHOULD Priority
14. **#47** + **#48** (FR-016 & FR-018): Check off items (purchase & equipment) — Paired work, partial
15. **#39** (FR-005): Multi-course meals (complete partial) — Medium, partial state
16. **#42** (FR-014): Estimated prices on shopping list — Simple, UI display
17. **#38** (FR-004): Meal parameters (trailside / time-constrained) — Simple, toggles

#### Key Patterns & Insights

**Dependency Chains:**
- Admin chain: #58 → #59 → #56 → #57 (strict order)
- Compliance chain: #54, #53 (parallel) → #55 → #51
- Sharing chain: #50, #49 (parallel) → #44
- Feedback infrastructure: #53 is a gating dependency for multiple issues (#55, #51, #52)

**Complexity Clusters:**
- Simple (6 issues): #57, #52, #49, #42, #38, #40 — UI-only or minimal logic
- Medium (8 issues): #58, #59, #55, #54, #51, #44, #48, #47 — Schema changes + API + UI
- Complex (4 issues): #56, #53, #50, #39 — Multi-container changes, Azure integrations, or full-stack

**Owner Distribution:**
- Data (Frontend): 11 issues (57, 52, 50, 49, 48, 47, 42, 40, 39, 38, 55)
- Mouth (Backend): 7 issues (59, 58, 56, 54, 53, 51, 44)

**Priority Split:**
- MUST (12 issues): 59, 58, 57, 56, 55, 54, 53, 52, 51, 50, 49, 44, 40
- SHOULD (6 issues): 48, 47, 42, 39, 38

#### Team Notes

1. **#53 (Content Moderation) is a gating issue** — Multiple issues (#55, #51, #52) cannot ship until this is done. Prioritize Mouth to start on this early.
2. **Partial work ready to complete** — #58, #57, #48, #47, #39 are partially implemented and could be quick wins once prioritized.
3. **COPPA compliance (#54, #56, #44)** — Data deletion, PII minimization, and member management form a compliance cluster. Do these together.
4. **Shareable links (#50)** — Complex due to unauthenticated routing and token management. Could be a good medium-term story.
5. **Email service** — #44 (shopping list email) requires service selection (ACS vs SendGrid). Coordinate with infrastructure.

#### Labels Applied
- All 18 issues now have `squad` label
- Primary owner assigned via `squad:data` or `squad:mouth`

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
