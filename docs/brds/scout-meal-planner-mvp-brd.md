---
title: "Scout Meal Planner — MVP Launch"
description: "Business requirements for launching the Scout Meal Planner with an initial pilot troop, addressing meal planning inefficiency, inconsistent record-keeping, and communication gaps."
author: "andyrob"
ms.date: "2026-04-18"
ms.topic: "business-requirements-document"
---

# Scout Meal Planner — MVP Launch

## Document Control

| Field | Value |
|---|---|
| **Version** | 1.0 — Approved |
| **Status** | Approved |
| **Author** | andyrob |
| **Date** | 2026-04-18 |
| **Approvers** | andyrob |

## Business Context and Background

Scout troops plan meals for camping trips and multi-day events as part of regular troop meetings. Today this process relies on informal methods — verbal discussion, paper notes, and ad-hoc text messages — leading to lost information, duplicated effort, and preventable mistakes on trips. A purpose-built meal planning tool can streamline planning, improve communication between scouts, adult leaders, and parents, and free up meeting time for other troop activities.

This initiative delivers a web-based meal planning application piloted with a single scout troop, with the potential to expand to additional troops.

## Problem Statement and Business Drivers

### Problem Statement

Meal planning for scout trips consumes excessive meeting time, produces inconsistent records, and creates communication breakdowns between scouts and adult leadership. These problems result in incorrect food purchases, forgotten or wrong equipment, and reduced time available for other troop activities.

### Business Drivers

- **Operational efficiency** — Reduce time spent on meal planning during meetings so more time is available for other scouting activities.
- **Accuracy** — Eliminate errors in food purchasing and equipment packing caused by inconsistent records.
- **Communication** — Provide a single source of truth for meal plans accessible to scouts, leaders, and parents.
- **Scalability** — Build a solution that can expand beyond the pilot troop to serve other troops.

## Business Objectives and Success Metrics

### Objectives

| ID | Objective | Measure | Baseline | Target | Timeframe |
|---|---|---|---|---|---|
| OBJ-001 | Reduce meeting time spent on meal planning | Minutes per meeting devoted to meal planning | 30–60+ min | ≤15 min | By 3rd trip using the app |
| OBJ-002 | Eliminate incorrect food purchases on trips | Trips with shopping errors or missing items | Most trips | Zero errors on routine trips | By 3rd trip using the app |
| OBJ-003 | Ensure correct equipment is packed for each trip | Trips with forgotten or wrong equipment | Most trips | Zero forgotten equipment on routine trips | By 3rd trip using the app |
| OBJ-004 | Ensure complete, accessible recipes on every trip | Trips with missing or incomplete recipe instructions | Most trips | All recipes accessible and complete at trip departure | By 2nd trip using the app |
| OBJ-005 | Improve communication between scouts, leaders, and parents | Scoutmaster manual transcription steps eliminated | Manual transcription every trip | Shareable link replaces transcription | Launch |

### Key Performance Indicators

| KPI | Baseline | Target | Measurement Method |
|---|---|---|---|
| Meeting time on meal planning | 30–60+ min | ≤15 min | Scoutmaster observation per meeting |
| Shopping list accuracy | Errors on most trips | Zero errors | Post-trip retrospective count |
| Equipment list completeness | Items forgotten most trips | Zero omissions | Post-trip retrospective count |
| Recipe availability on trip | Often incomplete or missing | 100% accessible | Spot-check at departure |
| User adoption rate (pilot troop) | 0% | 80% of active scouts | Unique logins per planning cycle |
| Post-trip feedback submission rate | Informal, in-person only | ≥50% of attendees submit feedback | In-app feedback count vs. trip roster |

## Stakeholders and Roles

| Stakeholder | Role | Interest | Impact Level |
|---|---|---|---|
| Scoutmaster | Sponsor / Oversight | Reduce meeting overhead, ensure trip readiness, transcribe and communicate plans to parents | High |
| Assistant Scoutmaster | Oversight | Support planning, oversee scout participation | High |
| Senior Patrol Leader (SPL) | Planning lead | Facilitates meal planning during meetings, coordinates patrols | High |
| Scouts | Primary users | Plan meals, shop for ingredients, cook, record feedback | High |
| Parents of Scouts | Secondary users | Visibility into meal plans, support purchasing and logistics | Medium |

## Scope

### In Scope

The MVP delivers the core meal planning workflow for a single troop:

- **Event creation** — Create a trip/event with dates, departure/return times, and logistical context (cabin vs. tent, power/water availability, altitude, trailer access, hiking trip).
- **Meal scheduling** — Define meals per day (breakfast, lunch, dinner, snacks) with parameters: trailside, time-constrained, multi-course, headcount (scouts + adults + guests).
- **Meal selection recording** — SPL or designated scout records the decided meals (app does not need to facilitate brainstorming or voting).
- **Recipe and ingredient management** — Capture ingredients with quantities, step-by-step cooking instructions, cooking method, and required equipment (pots, pans, utensils, spices/condiments).
- **Equipment list generation** — Consolidated equipment list for the event derived from assigned recipes.
- **Shopping list generation** — Consolidated list with quantities and estimated prices, divided by meal. Emailable to assigned shoppers.
- **Printable recipes** — Recipes can be printed for use on the trip.
- **Plan sharing** — Shareable link for parents and stakeholders (no login required to view).
- **Recipe library** — Save and reuse recipes across events.
- **Post-trip feedback** — Scouts submit feedback on meals after the trip (portions, taste, equipment issues, reuse recommendations).
- **Content moderation** — User-generated text scanned for inappropriate content.
- **Authentication and roles** — Scoutmaster, leaders, and scouts have appropriate access levels.

### Out of Scope (Post-MVP)

- Multi-troop support and cross-troop recipe sharing.
- Patrol management within the app (creating patrols, assigning scouts to patrols).
- In-app brainstorming and voting for meal selection.
- Individual scout shopper assignment within the app.
- Advanced filtering, favorites, and search.
- Advanced feedback analytics.
- Budget tracking and purchase receipt capture.
- Offline-first / progressive web app capabilities.
- Native mobile app (iPhone / Android).
- Integration with external shopping or calendar services.

### Assumptions

- Scouts and leaders have access to a web browser on phone or computer.
- The pilot troop has 3 patrols (typical structure).
- Internet access is available during planning meetings (not required on the trip itself).
- The Scoutmaster currently transcribes and forwards plans manually; the app replaces this step.

### Constraints

- **Prototype by May 2026** — A working prototype must be available for demonstration and early feedback.
- **Live by September 2026** — The application must be production-ready for the fall camping season.
- **Single developer** — The application is built and maintained by a single developer.
- **Youth safety and PII** — Minimize personally identifiable information stored for scouts (minors). No collection of email, phone, or address for youth members without guardian consent. Dietary restrictions are recorded at the meal level, never linked to individual people, as this is considered sensitive information.
- **Scouting America compliance** — The application must comply with Scouting America technology platform requirements for youth-facing applications. This includes communication guidelines and appropriate content safeguards. A compliance review is required before scouts access the app.
- **Content moderation** — User-generated text (feedback, notes, recipe names) must be scanned for offensive, abusive, or inappropriate language using a content moderation service (e.g., Azure Content Safety).
- **Mobile-first web** — Scouts primarily use phones (iPhone and Android). The web app must be fully functional on mobile browsers. Native app is a stretch goal, not an MVP requirement.
- **Trip headcount range** — The system must support groups of 8–35+ people (scouts, adults, and occasional guests).

## Business Requirements

### Event Management

| ID | Requirement | Linked Objective | Priority | Acceptance Criteria |
|---|---|---|---|---|
| BR-001 | A user can create an event with a name, date range, departure time, return time, and expected headcount (scouts, adults, guests). | OBJ-001 | Must | Event is persisted with all fields. Date range, times, and headcount are editable after creation. |
| BR-002 | A user can capture trip logistics on an event: camping type (tent/cabin), power availability, running water, trailer access, hiking trip, cooking at altitude, and expected weather. | OBJ-002, OBJ-003 | Must | Logistics fields are visible when planning meals and selecting recipes. |
| BR-003 | A user can define meals for each day of the event: breakfast, lunch, dinner, and snacks. | OBJ-001 | Must | Each day in the date range shows meal slots. Meals can be added and removed. |
| BR-004 | A user can mark a meal as trailside (must be prepared in advance) or time-constrained. | OBJ-002 | Should | Trailside and time-constraint flags are visible on the meal and in the schedule view. |
| BR-005 | A user can indicate that a meal has multiple courses (e.g., dinner with dessert). | OBJ-002 | Should | Multiple recipes can be assigned to a single meal slot. |
| BR-027 | A user can record dietary restrictions or considerations for a meal (e.g., nut allergy, vegetarian option needed). Restrictions are captured at the meal level, not linked to individual people. | OBJ-002 | Must | Dietary notes are visible on the meal in the schedule view and when selecting recipes. No dietary information is associated with a specific person. |

### Recipe Management

| ID | Requirement | Linked Objective | Priority | Acceptance Criteria |
|---|---|---|---|---|
| BR-006 | A user can create a recipe with a name, ingredient list (item, quantity, unit), step-by-step cooking instructions, and cooking method. | OBJ-002, OBJ-004 | Must | Recipe is saved to the library. All fields are editable. |
| BR-007 | A user can specify equipment required for a recipe: pots, pans, utensils, and supplemental items (spices, condiments) not listed as ingredients. | OBJ-003 | Must | Equipment items are stored with the recipe and appear on the event equipment list. |
| BR-008 | A user can assign a recipe from the library to a meal slot on an event. | OBJ-001, OBJ-002 | Must | Assigned recipe's ingredients and equipment flow into the event's shopping and equipment lists. |
| BR-009 | A user can save a recipe to the troop recipe library for reuse across events. | OBJ-001 | Must | Previously saved recipes are searchable and selectable when assigning to a meal. |
| BR-010 | Recipes can be scaled by headcount so ingredient quantities adjust proportionally. | OBJ-002 | Must | When headcount changes, ingredient quantities recalculate. Fractions display as practical cooking measurements. |
| BR-011 | A user can print a recipe in a format suitable for use on a trip (ingredients, instructions, equipment on one page). | OBJ-004 | Must | Browser print produces a clean, readable single-recipe printout. |

### Shopping List

| ID | Requirement | Linked Objective | Priority | Acceptance Criteria |
|---|---|---|---|---|
| BR-012 | The system generates a consolidated shopping list for an event from all assigned recipes, scaled to headcount. | OBJ-002 | Must | Duplicate ingredients across recipes are combined with summed quantities. List updates when meals or headcount change. |
| BR-013 | The shopping list displays estimated price per item when provided. | OBJ-002 | Should | Price column appears on the list. Total estimated cost is shown. |
| BR-014 | A user can email the shopping list (or a portion of it) to a specified email address. | OBJ-005 | Must | Email is sent with a readable shopping list. Recipient does not need an account. |
| BR-015 | Shopping list items can be checked off as purchased. | OBJ-002 | Should | Checked state persists across sessions. |

### Equipment List

| ID | Requirement | Linked Objective | Priority | Acceptance Criteria |
|---|---|---|---|---|
| BR-016 | The system generates a consolidated equipment list for an event from all assigned recipes. | OBJ-003 | Must | Duplicate equipment items are consolidated. List updates when meal assignments change. |
| BR-017 | Equipment list items can be checked off as packed. | OBJ-003 | Should | Checked state persists across sessions. |

### Plan Sharing

| ID | Requirement | Linked Objective | Priority | Acceptance Criteria |
|---|---|---|---|---|
| BR-018 | A user can generate a shareable read-only link to the event plan (schedule, recipes, shopping list, equipment list). | OBJ-005 | Must | Link is accessible without login. Displays current plan state. |

### Feedback

| ID | Requirement | Linked Objective | Priority | Acceptance Criteria |
|---|---|---|---|---|
| BR-019 | After a trip, scouts can submit structured feedback on each meal: rating, portion assessment (too much / just right / too little), and free-text comments. | OBJ-004 | Must | Feedback is linked to the specific meal and recipe. Multiple scouts can submit feedback for the same meal. |
| BR-020 | Feedback history is visible on a recipe in the library so planners can see past ratings and comments when selecting recipes for future events. | OBJ-001, OBJ-004 | Must | Recipe detail view shows aggregated ratings and individual comments from past events. |
| BR-021 | Feedback can be submitted at any time after the event ends, not only at the next meeting. | OBJ-004 | Must | Feedback form is available from the event detail as soon as the event end date passes. |

### Safety and Compliance

| ID | Requirement | Linked Objective | Priority | Acceptance Criteria |
|---|---|---|---|---|
| BR-022 | All user-generated text (recipe names, instructions, notes, feedback) is scanned by a content moderation service before being stored or displayed. | Compliance | Must | Offensive or inappropriate content is flagged and not displayed. Flagged content is reviewable by the Scoutmaster. |
| BR-023 | The application stores only first names for youth members. No email, phone, or address is collected for minors without guardian consent. | Compliance | Must | Account creation for youth accounts does not require or store PII beyond first name and authentication token. |
| BR-024 | Scoutmaster has administrative access to review flagged content and manage troop membership. | Compliance | Must | Admin view shows flagged items. Scoutmaster can approve, edit, or remove content. |

### Authentication

| ID | Requirement | Linked Objective | Priority | Acceptance Criteria |
|---|---|---|---|---|
| BR-025 | Users authenticate via Microsoft Entra ID (consumer accounts). | Compliance | Must | Login flow completes via MSAL. Session persists across browser refreshes. |
| BR-026 | Role-based access: Scoutmaster (admin), Leader (edit), Scout (edit assigned, submit feedback), Parent (read-only via shared link). | Compliance | Must | Each role sees only permitted actions. Unauthorized actions are rejected by the API. |

## Current and Future Business Processes

### Current State (As-Is)

Meal planning occurs during troop meetings, led by the Senior Patrol Leader (SPL) or a senior scout, with oversight from the Scoutmaster or Assistant Scoutmaster.

**Step 1 — Trip logistics briefing.** The group discusses trip parameters:

- Departure and return times.
- Camping type (tent or cabin).
- Available infrastructure (power, running water, trailer access).
- Trip type (hiking, car camping) and whether cooking at altitude.
- Expected weather conditions.

**Step 2 — Meal list and parameters.** The group identifies which meals are needed:

- Breakfast, lunch, dinner, and snacks for each day.
- Some meals may have multiple courses (e.g., dinner with dessert).
- Trailside meals must be prepared in advance.
- Time-constrained meals (e.g., fast breakfast before breaking camp).
- Headcount: scouts plus adults plus guests.

**Step 3 — Brainstorm and vote.** Scouts brainstorm meal ideas and vote on selections for each meal slot.

**Step 4 — Patrol planning.** The troop splits into patrols (typically three). Each patrol is assigned responsibility for a subset of meals and must produce:

- Ingredient list with quantities.
- Equipment list (cooking method, pots, pans, utensils, spices/condiments).
- Step-by-step cooking instructions.
- Shopping list with items, quantities, and estimated prices.
- Shopping assignments — each meal's shopping list is assigned to an individual scout.

**Step 5 — Handoff to Scoutmaster.** Patrol plans are given to the Scoutmaster, who manually transcribes them and sends the consolidated plan to parents.

**Step 6 — Shopping and packing.** Assigned scouts purchase ingredients. All ingredients are brought to the trip departure point for packing.

**Step 7 — Post-trip retrospective.** At the next troop meeting, scouts discuss what went well and what didn't, including meal feedback.

**Known pain points in the current process:**

- Recording is inconsistent — some patrols use paper, some use phones, some rely on memory.
- The Scoutmaster transcription step is manual and error-prone.
- Feedback happens at the next meeting; scouts who attended the trip may be absent, and details are forgotten by then.
- No reusable record of recipes — the same planning effort repeats for similar meals.
- Equipment is frequently forgotten because lists are incomplete or lost.

### Future State (To-Be)

The Scout Meal Planner replaces informal, manual processes with a structured digital workflow while preserving the scout-led planning culture.

**Step 1 — Event setup (SPL or Scoutmaster, in-app).** Create the event with dates, times, headcount, and trip logistics. This replaces the verbal logistics briefing with a persistent, shared record.

**Step 2 — Meal schedule (SPL, in-app).** Define meal slots for each day. Mark trailside or time-constrained meals. This replaces ad-hoc meal listing on paper.

**Step 3 — Meal decisions (meeting, recorded in-app).** The troop discusses and decides meals as they do today. The SPL records the selected meals and assigns recipes from the library or creates new ones. Brainstorming and voting remain in-person activities.

**Step 4 — Recipe detail (designated scouts, in-app).** Scouts enter or refine recipes: ingredients, quantities, cooking instructions, cooking method, and equipment. Previously used recipes are pulled from the library and adjusted. This replaces inconsistent paper/phone notes with a single structured record.

**Step 5 — Review and share (Scoutmaster, in-app).** The Scoutmaster reviews the consolidated plan — schedule, shopping list, equipment list — and shares a read-only link with parents. This eliminates manual transcription.

**Step 6 — Shopping (scouts, email from app).** Shopping lists are emailed to assigned scouts. Scouts check off items as purchased. This replaces handwritten or verbal shopping assignments.

**Step 7 — Trip execution (all, printed recipes).** Recipes are printed before departure. Scouts and leaders reference printed recipes while cooking. Equipment checklist is used during packing.

**Step 8 — Feedback (scouts, in-app, anytime after trip).** Scouts submit meal feedback directly in the app at any time after the event ends — no need to wait for the next meeting. Feedback is attached to the recipe for future planning.

**Key improvements over current state:**

- Single source of truth replaces scattered notes and verbal plans.
- Scoutmaster transcription step eliminated.
- Recipes accumulate feedback and are reused, reducing repeat planning effort.
- Shopping and equipment lists are generated automatically, reducing errors.
- Feedback is captured while memories are fresh, not deferred to the next meeting.

## Data and Reporting Requirements

- **Recipe library** — Persistent store of recipes with ingredients, instructions, equipment, and cooking method. Recipes are reusable across events.
- **Event data** — Events with dates, logistics, meal schedule, recipe assignments, headcount, and status (planning / active / completed).
- **Feedback data** — Structured ratings and free-text comments linked to meals and recipes.
- **Shopping list state** — Generated list with purchase check-off state per item.
- **Equipment list state** — Generated list with packing check-off state per item.
- **No reporting dashboards required for MVP.** Feedback history displayed inline on recipe detail is sufficient.

## Benefits and High-Level Economics

### Quantitative Benefits

- **Meeting time recovered** — Estimated 15–45 minutes per planning meeting redirected to other troop activities.
- **Error reduction** — Fewer incorrect purchases and forgotten equipment items per trip (target: zero on routine trips).
- **Feedback capture rate** — Move from informal, often-lost verbal feedback to structured, persistent records.

### Qualitative Benefits

- **Scout ownership** — Digital tool reinforces scout-led planning while providing structure.
- **Parent confidence** — Shared link gives parents visibility into meal plans without adding work for the Scoutmaster.
- **Institutional knowledge** — Recipe library preserves troop cooking knowledge across scout generations.
- **Reduced Scoutmaster burden** — Eliminates manual transcription and reduces coordination overhead.

### Cost Considerations

- **Hosting** — Azure Static Web App (free tier may suffice for pilot) plus Azure Functions consumption plan.
- **Database** — Azure Cosmos DB (free tier for pilot; monitor RU consumption as troop count grows).
- **Content moderation** — Azure Content Safety service (pay-per-call; low volume during pilot).
- **Authentication** — Microsoft Entra ID (free for consumer accounts via MSAL).
- **Developer time** — Single developer; primary cost is opportunity cost of time.

## Risks and Mitigations

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| RSK-001 | Scouting America compliance requirements block youth access to the app | High | High | Research Scouting America technology platform policies early (before prototype). Design for compliance from the start. Engage council-level contacts for guidance. |
| RSK-002 | Content moderation fails to catch inappropriate content | Medium | High | Integrate Azure Content Safety or equivalent service. Review flagged content manually during pilot. Implement reporting mechanism. |
| RSK-003 | Low scout adoption — scouts revert to informal methods | Medium | High | Involve SPL and senior scouts in design feedback. Ensure mobile experience is fast and intuitive. Demonstrate value on first trip. |
| RSK-004 | Single developer bottleneck delays September launch | Medium | Medium | Prioritize MVP features ruthlessly. Use existing component libraries (shadcn/ui). Accept rough edges in non-critical areas for launch. |
| RSK-005 | Poor mobile experience degrades usability during meetings | Medium | Medium | Mobile-first design and testing. Test on actual scout devices during prototype phase. |
| RSK-006 | Feedback is still not captured because scouts forget or skip it | Low | Medium | Enable in-app feedback immediately after the trip (push notification or reminder). Allow feedback from the field, not just at the next meeting. |
| RSK-007 | PII exposure for minor scouts | Low | High | Store only first names for youth. No email/phone collection for minors without guardian consent. Implement access controls and data retention policies. |

## Dependencies

| ID | Dependency | Owner | Status | Impact if Delayed |
|---|---|---|---|---|
| DEP-001 | Scouting America technology platform compliance review | Scoutmaster / Council | Not started | Blocks youth access to the app; adults-only workaround possible |
| DEP-002 | Content moderation service (Azure Content Safety or equivalent) | Developer | Not started | Blocks user-generated content features or requires manual review |
| DEP-003 | Microsoft Entra ID authentication (consumer accounts) | Developer | In progress | Blocks multi-user access and role-based permissions |

## Glossary

| Term | Definition |
|---|---|
| Troop | A local unit of scouts led by adult volunteers |
| Scoutmaster | The primary adult leader responsible for a troop |
| Assistant Scoutmaster | An adult leader who supports the Scoutmaster |
| Senior Patrol Leader (SPL) | The elected youth leader of the troop who facilitates meetings and planning |
| Patrol | A small group of scouts within a troop (typically 6–8 scouts) |
| Event | A camping trip or multi-day activity requiring meal planning |
| Trailside meal | A meal that must be prepared in advance because cooking on-site is not feasible |
| Headcount | The total number of people to feed: scouts + adults + guests |
| Scouting America | The national organization governing scout troops in the United States |
| Content moderation | Automated scanning of user-generated text for offensive, abusive, or inappropriate language |
