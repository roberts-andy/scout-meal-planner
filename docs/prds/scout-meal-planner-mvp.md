<!-- markdownlint-disable-file -->
<!-- markdown-table-prettify-ignore-start -->
# Scout Meal Planner MVP — Product Requirements Document (PRD)
Version 1.0 | Status Approved | Owner andyrob | Team Solo Developer | Target September 2026 | Lifecycle MVP

## Progress Tracker
| Phase | Done | Gaps | Updated |
|-------|------|------|---------|
| Context | Yes | None | 2026-04-18 |
| Problem & Users | Yes | None | 2026-04-18 |
| Scope | Yes | None | 2026-04-18 |
| Requirements | Yes | None | 2026-04-18 |
| Metrics & Risks | Yes | None | 2026-04-18 |
| Operationalization | Yes | None | 2026-04-18 |
| Finalization | Yes | None | 2026-04-18 |
Unresolved Critical Questions: 2 | TBDs: 0

## 1. Executive Summary
### Context
Scout troops plan meals for camping trips as part of regular troop meetings. Today this process relies on informal methods — verbal discussion, paper notes, and ad-hoc text messages — leading to lost information, duplicated effort, and preventable mistakes on trips. This initiative delivers a web-based meal planning application piloted with a single scout troop.

### Core Opportunity
Replace informal, error-prone meal planning with a structured digital tool that preserves scout-led planning culture while eliminating manual transcription, lost records, and communication breakdowns between scouts, leaders, and parents.

### Goals
| Goal ID | Statement | Type | Baseline | Target | Timeframe | Priority |
|---------|-----------|------|----------|--------|-----------|----------|
| G-001 | Reduce meeting time spent on meal planning | Efficiency | 30–60+ min per meeting | ≤15 min per meeting | By 3rd trip using the app | Must |
| G-002 | Eliminate incorrect food purchases on trips | Accuracy | Errors on most trips | Zero errors on routine trips | By 3rd trip using the app | Must |
| G-003 | Ensure correct equipment is packed for each trip | Accuracy | Items forgotten most trips | Zero forgotten equipment | By 3rd trip using the app | Must |
| G-004 | Ensure complete, accessible recipes on every trip | Completeness | Often incomplete or missing | 100% accessible at departure | By 2nd trip using the app | Must |
| G-005 | Improve communication between scouts, leaders, and parents | Communication | Manual transcription every trip | Shareable link replaces transcription | Launch | Must |

### Objectives (Optional)
| Objective | Key Result | Priority | Owner |
|-----------|------------|----------|-------|
| Working prototype for early feedback | Demo-ready by May 2026 | Must | andyrob |
| Production-ready for fall camping season | Live by September 2026 | Must | andyrob |
| Pilot troop adoption | 80% of active scouts logging in per planning cycle | Must | andyrob + Scoutmaster |

## 2. Problem Definition
### Current Situation
Meal planning occurs during troop meetings, led by the Senior Patrol Leader (SPL) with Scoutmaster oversight. The process involves verbal logistics briefing, brainstorming meal ideas, splitting into patrols to plan details, handoff to Scoutmaster for manual transcription, shopping, and post-trip retrospective. Recording is inconsistent (paper, phones, memory). The Scoutmaster transcription step is manual and error-prone. Feedback happens at the next meeting when details are forgotten. No reusable recipe records exist.

### Problem Statement
Meal planning for scout trips consumes excessive meeting time, produces inconsistent records, and creates communication breakdowns between scouts and adult leadership. These problems result in incorrect food purchases, forgotten or wrong equipment, and reduced time available for other troop activities.

### Root Causes
* Recording methods are inconsistent — some patrols use paper, some use phones, some rely on memory.
* No single source of truth — plans are scattered across notes, texts, and verbal agreements.
* Manual transcription by Scoutmaster is error-prone and time-consuming.
* No persistent recipe library — the same planning effort repeats for similar meals.
* Feedback is deferred to the next meeting, when attendees may be absent and details forgotten.
* Equipment lists are incomplete or lost between planning and packing.

### Impact of Inaction
Continued meeting time waste (30–60+ min per trip), repeated shopping errors, forgotten equipment on trips, lost institutional cooking knowledge as scouts age out, and ongoing Scoutmaster burden from manual transcription.

## 3. Users & Personas
| Persona | Goals | Pain Points | Impact |
|---------|-------|------------|--------|
| Senior Patrol Leader (SPL) | Efficiently lead meal planning, record decisions, coordinate patrols | Spends too long on planning, records get lost, has to repeat work | High — primary user for planning workflow |
| Scoutmaster | Reduce meeting overhead, ensure trip readiness, communicate plans to parents | Manual transcription, chasing down incomplete plans, no visibility until handoff | High — admin/oversight role |
| Scout (general) | Plan meals, shop for ingredients, cook on trip, give feedback | Inconsistent records, forgotten equipment, feedback not captured | High — hands-on user |
| Assistant Scoutmaster | Support planning, oversee scout participation | Duplicated oversight effort, no shared view of plan status | High — supporting role |
| Parent | Visibility into meal plans, support purchasing and logistics | No access to plans without Scoutmaster forwarding | Medium — read-only consumer via shared link |

### Journeys

#### Journey 1: SPL Plans a Camping Trip (Primary Planning Flow)

| Step | Action | Screen / Component | Feeling | Pain Point Addressed |
|------|--------|-------------------|---------|---------------------|
| 1 | SPL opens app on phone during troop meeting | Home / Event list | "Let’s get this done quickly" | Meetings run long on meal planning |
| 2 | Creates new event: name, dates, headcount, logistics | Create Event dialog | Focused — quick structured form | Replaces verbal briefing and scattered notes |
| 3 | Defines meal slots for each day (B/L/D/snacks), marks trailside or time-constrained | Event Schedule view | Organized — sees the whole trip at a glance | No more forgotten meal slots |
| 4 | Adds dietary notes to meals as discussed | Meal detail | Confident — restrictions recorded without naming individuals | Sensitive info stays at meal level |
| 5 | Browses recipe library, assigns recipes to meals (or creates new ones) | Recipe Library + Assign dialog | Efficient — reuses past recipes | Eliminates re-planning the same meals from scratch |
| 6 | Reviews auto-generated shopping list and equipment list | Shopping List / Equipment List tabs | Relieved — consolidated and scaled automatically | No more manual tallying and missed items |
| 7 | Emails shopping list to assigned scout shoppers | Email dialog | Done — shopping delegated in one tap | Replaces verbal assignments that get forgotten |
| 8 | Scoutmaster reviews and shares read-only link with parents | Shareable Link action | Satisfied — no more manual transcription | Eliminates the Scoutmaster bottleneck |
| 9 | Scouts print recipes before departure | Print Recipe action | Prepared — recipes in hand for the trip | No more missing or incomplete instructions on-site |

#### Journey 2: Scout Submits Post-Trip Feedback

| Step | Action | Screen / Component | Feeling | Pain Point Addressed |
|------|--------|-------------------|---------|---------------------|
| 1 | Scout opens app after returning from trip (anytime) | Home / Event list | "Want to share while I remember" | Feedback no longer deferred to next meeting |
| 2 | Selects completed event, opens feedback | Event Detail → Feedback tab | Easy — meals listed with recipes | Clear structure vs. vague "what did you think?" |
| 3 | Rates a meal: star rating, portion assessment (too much / just right / too little) | Feedback form | Quick — structured taps, not essay writing | Low friction encourages participation |
| 4 | Adds optional free-text comment | Feedback form (text area) | Expressive — can add detail if motivated | Captures specifics that structured ratings miss |
| 5 | Submits feedback (content moderation runs) | Submit button → success confirmation | Accomplished — "my input counts" | Feedback persists with the recipe for future planners |
| 6 | Next planning meeting: SPL views recipe with aggregated ratings and past comments | Recipe Detail → Feedback History | Informed — data-driven meal selection | Institutional knowledge preserved across trips |

## 4. Scope
### In Scope
* Event creation with dates, times, headcount, and trip logistics (camping type, power, water, trailer, hiking, altitude, weather).
* Meal scheduling — define meals per day (breakfast, lunch, dinner, snacks) with parameters (trailside, time-constrained, multi-course, headcount).
* Meal selection recording — SPL records decided meals (no in-app brainstorming or voting).
* Recipe and ingredient management — ingredients with quantities, instructions, cooking method, required equipment (pots, pans, utensils, spices/condiments).
* Dynamic recipe scaling by headcount.
* Equipment list generation — consolidated from assigned recipes.
* Shopping list generation — consolidated with quantities and estimated prices, divided by meal, emailable.
* Printable recipes for trip use.
* Plan sharing — shareable read-only link (no login required).
* Recipe library — save and reuse across events.
* Post-trip feedback — structured ratings, portion assessment, free-text comments.
* Dietary restrictions at meal level (never linked to individual people).
* Content moderation for user-generated text.
* Authentication via Microsoft Entra ID with role-based access.

### Out of Scope (justify if empty)
* Multi-troop-per-user support and cross-troop recipe sharing — post-MVP when pilot validates the model. Multi-troop will introduce a new admin role for approving new troops. Note: the current architecture is already multi-tenant (multiple troops coexist safely with data isolated by `troopId`); what is deferred is allowing a single user to belong to more than one troop with a troop-switcher UI.
* Patrol management within the app — one scout records information; patrol structure is managed offline.
* In-app brainstorming and voting — SPL records decisions made during in-person discussion.
* Individual scout shopper assignment in-app — shopping lists are emailed instead.
* Advanced filtering, favorites, and search — basic search only for MVP.
* Advanced feedback analytics and dashboards — inline feedback history is sufficient.
* Nutrition checker — validate daily meal plans against Scouting America nutritional guidelines (protein, fruits/vegetables, grains, etc.). Post-MVP; requires sourcing the specific guideline requirements.
* Budget tracking and purchase receipt capture.
* Offline-first / PWA capabilities.
* Native mobile app (iPhone / Android).
* Integration with external shopping or calendar services.

### Assumptions
* Scouts and leaders have access to a web browser on phone or computer.
* The pilot troop has 3 patrols (typical structure).
* Internet access is available during planning meetings (not required on the trip).
* The Scoutmaster currently transcribes and forwards plans manually; the app replaces this step.

### Constraints
* Single developer building and maintaining the application.
* Prototype by May 2026; production-ready by September 2026.
* Youth safety: only first names for youth members; no email/phone/address for minors without guardian consent.
* Dietary restrictions at meal level only — never linked to individuals (sensitive information).
* Scouting America compliance review required before youth access.
* Content moderation required for all user-generated text.
* Mobile-first web — scouts primarily use phones; must be fully functional on mobile browsers.
* Headcount range: 8–35+ people.

## 5. Product Overview
### Value Proposition
A purpose-built meal planning tool for scout troops that preserves scout-led planning culture while providing structured digital record-keeping, automatic list generation, and seamless communication with parents — eliminating manual transcription, lost records, and forgotten equipment.

### Differentiators (Optional)
* Designed specifically for scout troop meal planning workflows (not a generic meal planner).
* Preserves scout-led decision-making while providing digital structure.
* Youth safety by design — minimal PII, content moderation, role-based access.
* Printable recipes for offline trip use.
* Shareable read-only links for parent visibility without requiring accounts.

### UX / UI (Conditional)
**Design direction**: Outdoor adventure combined with practical organization. Should feel like a well-organized field guide — purposeful, rugged, and reliable. Easy to use in various lighting conditions.

**Color palette**:
- Primary: Deep Forest Green (oklch(0.45 0.09 155))
- Secondary: Warm Stone Gray (oklch(0.70 0.01 85)), Deep Earth Brown (oklch(0.35 0.04 60))
- Accent: Campfire Orange (oklch(0.68 0.18 50))
- All foreground/background pairings meet WCAG AA contrast ratios.

**Typography**:
- Headings: Space Grotesk (Bold/Semibold/Medium, 18–32px)
- Body: Source Sans 3 (Regular/Medium, 13–16px)
- Designed for outdoor readability with clear hierarchy.

**Key interaction patterns**:
- Spring-based list reordering animations.
- Number animations on recipe scaling.
- Satisfying check-off animations for shopping/equipment lists.
- Fluid accordion-style recipe detail expansion.
- Mobile: single column, bottom sheet navigation, sticky headers, 44x44px touch targets.

**Component library**: shadcn/ui (Radix + Tailwind CSS) — Card, Accordion, Dialog, Tabs, Select, Input, Button, Checkbox, Badge, Separator, Scroll Area, Command.

| UX Status | Notes |
|-----------|-------|
| Design direction | Defined — outdoor field guide aesthetic |
| Color palette | Defined — forest green, stone gray, earth brown, campfire orange |
| Typography | Defined — Space Grotesk headings, Source Sans 3 body |
| Component library | Selected — shadcn/ui |
| Mobile patterns | Defined — single column, bottom sheet nav, sticky headers |
| Wireframes | TBD |
| User journey maps | TBD |

## 6. Functional Requirements

### Event Management
| FR ID | Title | Description | Goals | Personas | Priority | Acceptance | Notes |
|-------|-------|------------|-------|----------|----------|-----------|-------|
| FR-001 | Create event | User creates an event with name, date range, departure time, return time, and expected headcount (scouts, adults, guests). | G-001 | SPL, Scoutmaster | Must | Event persisted with all fields. Date range, times, and headcount editable after creation. | BRD: BR-001 |
| FR-002 | Trip logistics | User captures trip logistics: camping type (tent/cabin), power availability, running water, trailer access, hiking trip, cooking at altitude, expected weather. | G-002, G-003 | SPL, Scoutmaster | Must | Logistics fields visible when planning meals and selecting recipes. | BRD: BR-002 |
| FR-003 | Meal scheduling | User defines meals for each day: breakfast, lunch, dinner, and snacks. | G-001 | SPL | Must | Each day shows meal slots. Meals can be added and removed. | BRD: BR-003 |
| FR-004 | Meal parameters | User marks a meal as trailside or time-constrained. | G-002 | SPL | Should | Flags visible on meal and in schedule view. | BRD: BR-004 |
| FR-005 | Multi-course meals | User indicates a meal has multiple courses (e.g., dinner with dessert). | G-002 | SPL | Should | Multiple recipes assignable to a single meal slot. | BRD: BR-005 |
| FR-006 | Dietary restrictions | User records dietary restrictions or considerations at the meal level (e.g., nut allergy, vegetarian option needed). Never linked to individuals. | G-002 | SPL, Scoutmaster | Must | Dietary notes visible on meal in schedule view and when selecting recipes. No association with a specific person. | BRD: BR-027 |

### Recipe Management
| FR ID | Title | Description | Goals | Personas | Priority | Acceptance | Notes |
|-------|-------|------------|-------|----------|----------|-----------|-------|
| FR-007 | Create recipe | User creates a recipe with name, ingredient list (item, quantity, unit), step-by-step instructions, and cooking method. | G-002, G-004 | SPL, Scout | Must | Recipe saved to library with all fields editable. | BRD: BR-006 |
| FR-008 | Recipe equipment | User specifies required equipment: pots, pans, utensils, and supplemental items (spices, condiments). | G-003 | SPL, Scout | Must | Equipment stored with recipe and appears on event equipment list. | BRD: BR-007 |
| FR-009 | Assign recipe to meal | User assigns a recipe from the library to a meal slot on an event. | G-001, G-002 | SPL | Must | Assigned recipe's ingredients and equipment flow into shopping and equipment lists. | BRD: BR-008 |
| FR-010 | Recipe library | User saves a recipe to the troop library for reuse across events. | G-001 | SPL, Scout | Must | Saved recipes searchable and selectable when assigning to a meal. | BRD: BR-009 |
| FR-011 | Recipe scaling | Recipes scale by headcount — ingredient quantities adjust proportionally. | G-002 | SPL | Must | Quantities recalculate when headcount changes. Fractions display as practical cooking measurements. | BRD: BR-010 |
| FR-012 | Print recipe | User prints a recipe in a trip-ready format (ingredients, instructions, equipment on one page). | G-004 | Scout | Must | Browser print produces clean, readable single-recipe printout. | BRD: BR-011 |

### Shopping List
| FR ID | Title | Description | Goals | Personas | Priority | Acceptance | Notes |
|-------|-------|------------|-------|----------|----------|-----------|-------|
| FR-013 | Generate shopping list | System generates a consolidated shopping list from all assigned recipes, scaled to headcount. | G-002 | SPL, Scout | Must | Duplicates combined with summed quantities. Updates when meals or headcount change. | BRD: BR-012 |
| FR-014 | Estimated prices | Shopping list displays estimated price per item when provided. | G-002 | SPL | Should | Price column visible. Total estimated cost shown. | BRD: BR-013 |
| FR-015 | Email shopping list | User emails the shopping list (or portion) to a specified email address. | G-005 | SPL, Scoutmaster | Must | Email sent with readable list. Recipient does not need an account. | BRD: BR-014 |
| FR-016 | Check off purchases | Shopping list items can be checked off as purchased. | G-002 | Scout | Should | Checked state persists across sessions. | BRD: BR-015 |

### Equipment List
| FR ID | Title | Description | Goals | Personas | Priority | Acceptance | Notes |
|-------|-------|------------|-------|----------|----------|-----------|-------|
| FR-017 | Generate equipment list | System generates a consolidated equipment list from all assigned recipes. | G-003 | SPL | Must | Duplicates consolidated. Updates when meal assignments change. | BRD: BR-016 |
| FR-018 | Check off packed items | Equipment list items can be checked off as packed. | G-003 | Scout | Should | Checked state persists across sessions. | BRD: BR-017 |

### Plan Sharing
| FR ID | Title | Description | Goals | Personas | Priority | Acceptance | Notes |
|-------|-------|------------|-------|----------|----------|-----------|-------|
| FR-019 | Shareable read-only link | User generates a shareable read-only link to the event plan (schedule, recipes, shopping list, equipment list). | G-005 | Scoutmaster | Must | Link accessible without login. Displays current plan state. | BRD: BR-018 |

### Feedback
| FR ID | Title | Description | Goals | Personas | Priority | Acceptance | Notes |
|-------|-------|------------|-------|----------|----------|-----------|-------|
| FR-020 | Submit meal feedback | After a trip, scouts submit structured feedback: rating, portion assessment (too much / just right / too little), and free-text comments. | G-004 | Scout | Must | Feedback linked to specific meal and recipe. Multiple scouts can submit for same meal. | BRD: BR-019 |
| FR-021 | Feedback on recipe detail | Feedback history visible on recipe in library — aggregated ratings and individual comments from past events. | G-001, G-004 | SPL | Must | Recipe detail shows past ratings and comments. | BRD: BR-020 |
| FR-022 | Anytime feedback | Feedback submittable any time after event ends, not only at next meeting. | G-004 | Scout | Must | Feedback form available from event detail as soon as event end date passes. | BRD: BR-021 |

### Safety, Compliance & Auth
| FR ID | Title | Description | Goals | Personas | Priority | Acceptance | Notes |
|-------|-------|------------|-------|----------|----------|-----------|-------|
| FR-023 | Content moderation | All user-generated text scanned by content moderation service before storage or display. | Compliance | All | Must | Offensive content flagged and not displayed. Flagged content reviewable by Scoutmaster. | BRD: BR-022 |
| FR-024 | Youth PII minimization | Application stores only first names for youth. No email, phone, or address for minors without guardian consent. | Compliance | All | Must | Youth account creation does not require or store PII beyond first name and auth token. | BRD: BR-023 |
| FR-025 | Admin content review | Scoutmaster has admin access to review flagged content and manage troop membership. | Compliance | Scoutmaster | Must | Admin view shows flagged items. Scoutmaster can approve, edit, or remove. | BRD: BR-024 |
| FR-026 | Authentication | Users authenticate via Microsoft Entra ID (consumer accounts). | Compliance | All | Must | Login via MSAL. Session persists across browser refreshes. | BRD: BR-025 |
| FR-027 | Role-based access | Scoutmaster (admin), Leader (edit), Scout (edit assigned, submit feedback), Parent (read-only via shared link). | Compliance | All | Must | Each role sees only permitted actions. Unauthorized actions rejected by API. | BRD: BR-026 |

### Troop Administration
| FR ID | Title | Description | Goals | Personas | Priority | Acceptance | Notes |
|-------|-------|------------|-------|----------|----------|-----------|-------|
| FR-028 | Invite members | Scoutmaster invites new members by generating an invite code or sending an invite link through the UI when adding a member. | Compliance | Scoutmaster | Must | Invite code and invite link both produce a valid join flow. New member appears in troop roster after accepting. | BRD: BR-024 |
| FR-029 | Assign and change roles | Scoutmaster assigns or changes a member's role (Leader, Scout). | Compliance | Scoutmaster | Must | Role change takes effect immediately. Member sees updated permissions on next action. | BRD: BR-024 |
| FR-030 | Deactivate or remove members | Scoutmaster deactivates or removes a member from the troop. Deactivated members lose access but data is retained. Removed members are permanently dissociated. | Compliance | Scoutmaster | Must | Deactivated member cannot log in to troop. Removed member no longer appears in roster. Feedback and event history attributed to deactivated members remain intact. | BRD: BR-024 |

### Feature Hierarchy (Optional)
```plain
Scout Meal Planner MVP
├── Event Management
│   ├── Create/Edit Event (FR-001, FR-002)
│   ├── Meal Scheduling (FR-003, FR-004, FR-005)
│   └── Dietary Restrictions (FR-006)
├── Recipe Management
│   ├── Create/Edit Recipe (FR-007, FR-008)
│   ├── Recipe Library (FR-010)
│   ├── Assign to Meal (FR-009)
│   ├── Recipe Scaling (FR-011)
│   └── Print Recipe (FR-012)
├── Lists
│   ├── Shopping List (FR-013, FR-014, FR-015, FR-016)
│   └── Equipment List (FR-017, FR-018)
├── Communication
│   ├── Shareable Link (FR-019)
│   └── Email Shopping List (FR-015)
├── Feedback
│   ├── Submit Feedback (FR-020, FR-022)
│   └── Feedback History (FR-021)
├── Troop Administration
│   ├── Invite Members (FR-028)
│   ├── Assign Roles (FR-029)
│   └── Deactivate/Remove Members (FR-030)
└── Safety & Auth
    ├── Authentication (FR-026)
    ├── Role-Based Access (FR-027)
    ├── Content Moderation (FR-023)
    ├── Youth PII (FR-024)
    └── Admin Review (FR-025)
```

## 7. Non-Functional Requirements
| NFR ID | Category | Requirement | Metric/Target | Priority | Validation | Notes |
|--------|----------|------------|--------------|----------|-----------|-------|
| NFR-001 | Performance | Page load time on mobile | Responsive during meetings — no specific ms target; optimize for perceived speed on mobile | Must | Manual testing during pilot meetings; Lighthouse as guidance | MVP: optimize for feel, not a hard number |
| NFR-002 | Performance | API response time | Fast enough not to frustrate scouts — no hard latency target | Must | Manual testing; AppInsights latency monitoring | Revisit with real usage data post-launch |
| NFR-003 | Reliability | Application uptime | Azure SWA default (~99.95% SLA) | Must | Azure platform SLA + AppInsights availability | No custom SLA for pilot |
| NFR-004 | Scalability | Concurrent users supported | Pilot: single troop, 20–35 users | Should | Organic pilot usage | Revisit if multi-troop added |
| NFR-005 | Security | Authentication via Entra ID | All API calls require valid JWT | Must | Auth middleware tests | Implemented |
| NFR-006 | Security | Content moderation latency | Non-blocking UX — moderation can run async if needed | Must | Integration testing with sandbox | |
| NFR-007 | Privacy | Youth PII minimization | Only first name + auth token stored for minors | Must | Data audit | |
| NFR-008 | Accessibility | WCAG 2.1 AA compliance | All color pairings meet contrast ratios | Should | axe-core audit | Color palette verified |
| NFR-009 | Maintainability | TypeScript strict mode | Zero `any` types in production code | Must | Build-time check | Active |
| NFR-010 | Maintainability | Test coverage | ~70% unit coverage for API, key component tests for frontend, one smoke e2e suite | Should | Vitest coverage report + Playwright smoke suite | Realistic for solo developer |
| NFR-011 | Mobile | Mobile-first responsive design | Fully functional on mobile browsers, 44x44px touch targets | Must | Manual testing on devices | |
| NFR-012 | Localization | English only for MVP | N/A | — | — | Post-MVP consideration |

## 8. Data & Analytics (Conditional)
### Inputs
* Event data: name, dates, times, headcount, logistics, meal schedule, recipe assignments.
* Recipe data: name, ingredients (item/quantity/unit), instructions, cooking method, equipment.
* Feedback data: ratings, portion assessments, free-text comments per meal per scout.
* User data: first name, auth token, role assignment.

### Outputs / Events
* Shopping lists: consolidated, scaled, emailable.
* Equipment lists: consolidated from assigned recipes.
* Shareable read-only event plan links.
* Printable recipe pages.
* Aggregated feedback on recipe detail pages.

### Instrumentation Plan
| Event | Trigger | Payload | Purpose | Owner |
|-------|---------|--------|---------|-------|
| Event created | User creates event | eventId, troopId, headcount | Track planning activity | Dev |
| Recipe assigned | Recipe assigned to meal | eventId, recipeId, mealSlot | Track recipe reuse | Dev |
| Shopping list emailed | User emails shopping list | eventId, recipientCount | Track communication feature usage | Dev |
| Feedback submitted | Scout submits feedback | eventId, recipeId, rating | Track feedback engagement | Dev |
| Content flagged | Moderation flags content | contentType, severity | Track moderation activity | Dev |
| Shared link generated | User creates shareable link | eventId | Track sharing adoption | Dev |

### Metrics & Success Criteria
| Metric | Type | Baseline | Target | Window | Source |
|--------|------|----------|--------|--------|--------|
| Meeting time on meal planning | Operational | 30–60+ min | ≤15 min | By 3rd trip | Scoutmaster observation |
| Shopping list accuracy | Operational | Errors most trips | Zero errors | By 3rd trip | Post-trip retrospective |
| Equipment list completeness | Operational | Items forgotten most trips | Zero omissions | By 3rd trip | Post-trip retrospective |
| Recipe availability on trip | Operational | Often incomplete | 100% accessible | By 2nd trip | Spot-check at departure |
| User adoption rate (pilot) | Adoption | 0% | 80% active scouts | Per planning cycle | Unique logins |
| Feedback submission rate | Engagement | Informal only | ≥50% attendees | Per trip | In-app count vs. roster |

## 9. Dependencies
| Dependency | Type | Criticality | Owner | Risk | Mitigation |
|-----------|------|------------|-------|------|-----------|
| Scouting America compliance review | Regulatory | High | Scoutmaster / Council | Blocks youth access | Research early; adults-only workaround possible |
| Azure Content Safety integration | Service | High | Developer | Blocks UGC features | Manual review fallback during pilot |
| Microsoft Entra ID (MSAL) | Service | High | Developer | Blocks multi-user access | In progress; consumer accounts |

## 10. Risks & Mitigations
| Risk ID | Description | Severity | Likelihood | Mitigation | Owner | Status |
|---------|-------------|---------|-----------|-----------|-------|--------|
| RSK-001 | Scouting America compliance blocks youth access | High | High | Research policies early, design for compliance, engage council contacts | Scoutmaster + Dev | Not started |
| RSK-002 | Content moderation fails to catch inappropriate content | High | Medium | Integrate Azure Content Safety, manual review during pilot, reporting mechanism | Dev | Not started |
| RSK-003 | Low scout adoption — revert to informal methods | High | Medium | Involve SPL in design feedback, fast mobile UX, demonstrate value on first trip | Dev + Scoutmaster | Not started |
| RSK-004 | Single developer bottleneck delays September launch | Medium | Medium | Ruthless MVP prioritization, use shadcn/ui, accept rough edges in non-critical areas | Dev | Active |
| RSK-005 | Poor mobile experience | Medium | Medium | Mobile-first design, test on actual scout devices during prototype | Dev | Active |
| RSK-006 | Feedback not captured — scouts forget or skip it | Medium | Low | Enable feedback immediately after trip, in-app reminders | Dev | Not started |
| RSK-007 | PII exposure for minor scouts | High | Low | First names only, no email/phone for minors, access controls, data retention policies | Dev | Partially addressed |

## 11. Privacy, Security & Compliance
### Data Classification
* **Public**: Shared read-only event plans (via shareable link).
* **Internal**: Recipes, meal schedules, shopping lists, equipment lists, event details.
* **Sensitive**: Dietary restrictions (meal-level only, never person-linked), feedback comments, flagged content.
* **Restricted**: Authentication tokens, user role assignments.

### PII Handling
* Youth members: first name + auth token only. No email, phone, or address without guardian consent.
* Adult members: name + Microsoft account (via Entra ID). No additional PII stored by the application.
* Parents: no account required — access via shareable read-only link.

### Threat Considerations
* Unauthorized access to troop data — mitigated by Entra ID auth + RBAC middleware.
* Inappropriate content from youth users — mitigated by content moderation service.
* PII leakage for minors — mitigated by minimal data collection and meal-level dietary restrictions.
* Shareable link exposure — links are read-only, contain no PII, can be regenerated/revoked.

### Regulatory / Compliance (Conditional)
| Regulation | Applicability | Action | Owner | Status |
|-----------|--------------|--------|-------|--------|
| Scouting America technology platform policy | Required for youth-facing app | Compliance review before youth access | Scoutmaster / Council | Not started |
| COPPA (Children's Online Privacy Protection Act) | Potentially applicable if users under 13 | Minimize PII, parental consent for minors, review data practices | Dev | Design addresses; legal review TBD |

## 12. Operational Considerations
| Aspect | Requirement | Notes |
|--------|------------|-------|
| Deployment | GitHub Actions CI/CD: CI on PRs (build + test), deploy on push to `main`. Frontend → Azure SWA via `static-web-apps-deploy`. API → Azure Functions via blob deploy + restart. Infra → Bicep via manual workflow dispatch. | 3 workflows: `ci.yml`, `deploy.yml`, `infra.yml`. Smart path filtering skips unchanged components. |
| Rollback | Redeploy previous version from `main` branch | Sufficient for MVP; no blue/green or slot-based deployment needed |
| Monitoring | Azure Application Insights | Instrument frontend and API for request tracing, latency, errors, and availability |
| Alerting | AppInsights default alerts (failures, availability) | Fine-tune alert thresholds after pilot usage establishes baselines |
| Support | Single developer + Scoutmaster for pilot | No formal support model for MVP |
| Capacity Planning | Pilot: single troop (20–35 users), low RU consumption | Monitor Cosmos DB RUs via AppInsights |

## 13. Rollout & Launch Plan
### Phases / Milestones
| Phase | Date | Gate Criteria | Owner |
|-------|------|--------------|-------|
| Prototype | May 2026 | Core event + recipe + list flows demo-ready; AppInsights instrumented | Dev |
| Scouting America compliance review | May–Jun 2026 | Policy review complete, any required changes implemented | Scoutmaster + Dev |
| Content moderation integration | Jun–Jul 2026 | Azure Content Safety active, flagging tested via sandbox | Dev |
| Beta (adults only) | Jul–Aug 2026 | Scoutmaster + leaders can create events and plan meals end-to-end | Dev |
| MVP Launch | September 2026 | All Must requirements pass acceptance, compliance cleared, CI green | Dev + Scoutmaster |

### Feature Flags (Conditional)

Feature flags enable progressive rollout, safe experimentation, and quick kill-switches without redeployment. Flags are evaluated at runtime and can be toggled per environment (dev, beta, production).

**Implementation approach**: Use a simple flags configuration (e.g., environment variables or a JSON config served by the API) for MVP. Migrate to Azure App Configuration feature management if flag count or complexity grows post-MVP.

**Flag lifecycle**: Each flag has a sunset criteria — once the feature is stable and fully rolled out, remove the flag and the conditional code. Stale flags add complexity.

| Flag | Purpose | Default | Sunset Criteria |
|------|---------|--------|----------------|
| `enable-content-moderation` | Gate Azure Content Safety integration. Off during early dev; on for beta and launch. Allows fallback to manual-only review if service has issues. | Off (dev), On (beta+) | Remove after 2 successful trips with moderation active and no service issues |
| `enable-email-shopping-list` | Gate email sending for shopping lists (FR-015). Prevents accidental emails during development and testing. | Off (dev), On (beta+) | Remove after email integration confirmed working in production |
| `enable-shared-links` | Gate shareable read-only link generation (FR-019). Allows testing the view without exposing real links prematurely. | Off (dev), On (beta+) | Remove after first shared link successfully used by a parent |
| `enable-feedback` | Gate post-trip feedback submission (FR-020–022). Can be turned off if content moderation is not yet active (feedback includes free text). | Off (until content moderation active) | Remove after 2 trips with feedback successfully collected |
| `enable-print-recipes` | Gate print-formatted recipe view (FR-012). Low risk, but useful to defer print CSS work until core flows are solid. | On | Remove after print format validated on actual trip |

**Principles for effective flag usage**:
1. **One flag per independently deployable capability** — don’t bundle unrelated features behind a single flag.
2. **Default to off for anything with external side effects** (emails, shared links, third-party API calls).
3. **Default to on for pure UI features** that don’t affect data or external systems.
4. **Always test both paths** — write at least one test with the flag on and one with it off.
5. **Sunset aggressively** — once a feature is stable in production, remove the flag within the next release cycle. Dead flags are technical debt.
6. **Log flag evaluations** — emit an AppInsights event when a flag changes user experience, so you can correlate behavior with flag state.

### Communication Plan (Optional)
1. **Scoutmaster** introduces tool at a troop meeting (beta phase).
2. **SPL walkthrough** — developer demos core planning flow with SPL before first real use.
3. **Parent notification** — Scoutmaster shares info via existing troop communication channel (email list / Remind app) when shared links go live.
4. **Feedback loop** — collect informal usability feedback from SPL and Scoutmaster after first 2 trips.

## 14. Open Questions
| Q ID | Question | Owner | Deadline | Status |
|------|----------|-------|---------|--------|
| OQ-001 | What are Scouting America's specific technology platform requirements for youth-facing apps? | Scoutmaster | Before prototype | Open |
| OQ-002 | ~~What performance targets are appropriate for mobile page load and API response times?~~ | Dev | — | Resolved — optimize for perceived speed, no hard targets |
| OQ-003 | ~~What test coverage target is realistic for a solo developer?~~ | Dev | — | Resolved — ~70% API unit, key frontend components, smoke e2e |
| OQ-004 | Should the app support COPPA compliance explicitly, or is Scouting America compliance sufficient? | Dev | Before youth access | Open |
| OQ-005 | ~~What is the monitoring and alerting strategy for the MVP?~~ | Dev | — | Resolved — Azure Application Insights with default alerts |

## 15. Changelog
| Version | Date | Author | Summary | Type |
|---------|------|-------|---------|------|
| 0.1 | 2026-04-18 | andyrob | Initial PRD draft — populated from approved BRD v1.0 and existing design direction | Creation |
| 1.0 | 2026-04-18 | andyrob | Approved — added troop admin FRs (FR-028–030), feature flags, user journeys, communication plan. 2 open questions remain (external dependencies, not blockers). | Approval |

## 16. References & Provenance
| Ref ID | Type | Source | Summary | Conflict Resolution |
|--------|------|--------|---------|--------------------|
| REF-001 | BRD | docs/brds/scout-meal-planner-mvp-brd.md | Approved BRD v1.0 — 27 business requirements, objectives, process flows, risks | Primary source for all functional requirements |
| REF-002 | Design | PRD.md (root) | Original PRD with design direction — colors, fonts, components, animations, mobile patterns | Design elements preserved; feature scope replaced by BRD |

### Citation Usage
All functional requirements (FR-001 through FR-027) trace directly to BRD business requirements (BR-001 through BR-027). Design direction (Section 5 UX/UI) preserved from REF-002. Feature scope and priorities governed by REF-001.

## 17. Appendices (Optional)
### Glossary
| Term | Definition |
|------|-----------|
| Troop | A local unit of scouts led by adult volunteers |
| Scoutmaster | The primary adult leader responsible for a troop |
| SPL (Senior Patrol Leader) | The elected youth leader of the troop who facilitates meetings and planning |
| Patrol | A small group of scouts within a troop (typically 6–8 scouts) |
| Event | A camping trip or multi-day activity requiring meal planning |
| Trailside meal | A meal prepared in advance because on-site cooking is not feasible |
| Headcount | Total people to feed: scouts + adults + guests |

### Additional Notes
**Technology stack**: React + Vite frontend, Azure Functions v4 (Node.js) API, Azure Cosmos DB, Azure Static Web App, Microsoft Entra ID (MSAL), Tailwind CSS, shadcn/ui, TanStack Query, Zod schemas, Vitest + Playwright.

Generated 2026-04-18 by PRD Builder (mode: iterative)
<!-- markdown-table-prettify-ignore-end -->
