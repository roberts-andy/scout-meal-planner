<!-- markdownlint-disable-file -->
<!-- markdown-table-prettify-ignore-start -->
# Scout Meal Planner — Privacy Policy & Data Handling Reference

Version 1.0 | Effective 2026-04-18 | Owner: andyrob

> This document serves two purposes: (1) user-facing privacy policy for the Scout Meal Planner application, and (2) decision reference for developers and agents working on the codebase. When making implementation decisions about data collection, storage, or sharing, consult this policy.

## 1. What We Collect

| Data Category | What | Who | Why | Stored Where |
|--------------|------|-----|-----|-------------|
| Authentication token | Microsoft Entra ID token (OAuth) | All users | Verify identity | In-memory only (not persisted) |
| Display name | First name (youth) or full name (adults) | All members | Identify members in troop context | Cosmos DB `members` container |
| Email address | Microsoft account email | Adult members only | Account recovery, admin contact | Cosmos DB `members` container |
| Role & status | Troop role, membership status | All members | Access control (RBAC) | Cosmos DB `members` container |
| Event data | Event names, dates, meal schedules | Created by leaders/SPL | Meal planning | Cosmos DB `events` container |
| Recipe data | Recipe names, ingredients, instructions, equipment | Created by leaders/scouts | Recipe library | Cosmos DB `recipes` container |
| Feedback | Star ratings, portion assessment, free-text comments, photos | Submitted by scouts | Post-trip improvement | Cosmos DB `feedback` container |
| Dietary notes | Meal-level dietary restrictions | Entered by leaders | Meal planning safety | Embedded in event meal records |

### What We Do NOT Collect
* Email addresses for youth members (under 18).
* Phone numbers, home addresses, or GPS location for any user.
* Browsing history, cookies for tracking, or advertising identifiers.
* Individual-linked dietary or medical information — dietary notes are at the meal level only, never associated with a specific person.
* Payment or financial information.

## 2. Why We Collect It

All data collected serves one of these purposes:
1. **Authentication and access control** — verify identity and enforce role-based permissions.
2. **Meal planning functionality** — events, recipes, shopping lists, equipment lists.
3. **Post-trip improvement** — feedback to improve future meal plans.
4. **Troop administration** — member management, invitations, role assignments.

We do not use data for advertising, marketing, analytics beyond basic application health monitoring (Azure Application Insights), or any purpose unrelated to troop meal planning.

## 3. How We Store and Protect Data

| Control | Implementation |
|---------|---------------|
| Encryption at rest | Azure Cosmos DB default encryption (AES-256) |
| Encryption in transit | HTTPS enforced via Azure Static Web Apps |
| Authentication | Microsoft Entra ID (OAuth 2.0 / OIDC) |
| Authorization | Role-based access control — API enforces permission checks on every request |
| Data isolation | All troop data partitioned by `troopId` — one troop cannot access another's data |
| Content moderation | User-generated text scanned before storage (Azure Content Safety) |
| Infrastructure | Azure Static Web Apps + Azure Functions (managed, patched by Microsoft) |

## 4. Who Can Access Data

| Role | Can Access | Cannot Access |
|------|-----------|--------------|
| Troop Admin (Scoutmaster) | All troop data, member management, flagged content review, data deletion | Other troops' data |
| Adult Leader | Events, recipes, feedback, shopping/equipment lists | Member management, flagged content |
| Senior Patrol Leader | Events, recipes, feedback, shopping/equipment lists | Member management, flagged content |
| Patrol Leader | Events, recipes, feedback (own), shopping/equipment lists | Other scouts' feedback, member management |
| Scout | Events, recipes, own feedback, shopping/equipment lists | Other scouts' feedback, member management |
| Parent (via shared link) | Read-only event plan (schedule, recipes, shopping list, equipment) | Feedback, member data, admin functions |

## 5. Data Retention

| Data Type | Retention | Deletion Trigger |
|-----------|----------|-----------------|
| Member records | Until member removed by admin or deletion requested | Admin action or parental request |
| Event data | Indefinite (historical reference for future planning) | Admin deletes event |
| Recipes | Indefinite (troop library asset) | Admin deletes recipe |
| Feedback | Indefinite (tied to recipe improvement) | Admin deletes, or member data deletion request |
| Authentication tokens | Session-scoped (not persisted) | Browser session ends |

## 6. Children's Privacy (COPPA)

Scout Meal Planner is designed for use by scout troops, which include members under 13. We comply with COPPA through the following controls:

1. **Minimal data collection for youth**: Only first name and authentication token. No email, phone, or address.
2. **Parental consent via Microsoft Family accounts**: Scouts under 13 must use a Microsoft account managed by a parent/guardian. Microsoft's family consent flow satisfies COPPA's verifiable parental consent requirement at account creation.
3. **Consent notice at join**: When a scout joins a troop via invite code, the app displays: *"By joining, a parent/guardian confirms they consent to data collection as described in our privacy policy."* The invite code is distributed by the troop leader to parents, establishing an offline consent chain.
4. **Parental rights**:
   * **Review**: Parents can request a summary of their child's data by contacting the troop admin.
   * **Delete**: Parents can request deletion of all their child's data. The troop admin executes this via the member data deletion function (FR-031). Feedback from deleted members is either anonymized or removed.
   * **Refuse further collection**: Parents can revoke their child's Microsoft account access at any time, which immediately prevents further data collection.
5. **Content moderation**: All user-generated text (including from youth) is scanned by Azure Content Safety before storage.

## 7. Data Sharing

We do not share data with third parties. Data flows only to:
* **Azure services** (Cosmos DB, Static Web Apps, Functions, Content Safety, Application Insights) — Microsoft is the infrastructure provider, governed by Microsoft's data processing agreements.
* **Shareable read-only links** — event plans accessible without login. These contain no PII (no member names, emails, or feedback). Links can be regenerated or revoked by the troop admin.

## 8. Data Deletion

### Member data deletion (FR-031)
Troop admins can delete all data associated with a specific member. This removes or anonymizes:
* Member record (name, role, status)
* Feedback submitted by the member
* Audit trail entries attributable to the member

### Account deletion
Users can delete their Microsoft account independently. This revokes authentication but does not automatically remove troop data. A separate data deletion request to the troop admin is required.

### Requesting deletion
For the MVP pilot, contact the troop admin directly or email a deletion request via the link in the application footer.

## 9. Agent & Developer Decision Reference

When building features, apply these rules:

| Principle | Rule | Example |
|-----------|------|---------|
| Data minimization | Do not add new PII fields without updating this policy and confirming COPPA compliance | Adding "last name" to youth profiles would violate policy |
| Youth safety | Never link dietary restrictions, medical info, or allergies to a specific person | Dietary notes go on the meal, not the member |
| Consent chain | Any new data collection from youth requires reviewing the consent model in PRD Section 11 | Adding photo uploads from scouts needs consent review |
| Sharing scope | Shareable links must never expose PII, feedback text, or member information | Shopping list: OK. Feedback comments: not OK |
| Deletion completeness | Any new data type that references a `userId` or `memberId` must be included in the FR-031 deletion cascade | New "assignments" container would need deletion support |
| Content moderation | All free-text input from any user must pass through content moderation before storage | Recipe names, feedback comments, event descriptions |
| Audit trail | When anonymizing deleted member data, replace identifiable info with a placeholder (e.g., "Deleted Member") rather than removing the record entirely | Preserves event history integrity |

## 10. Changes to This Policy

Changes to this policy are tracked in the changelog below and referenced in the PRD.

| Version | Date | Summary |
|---------|------|---------|
| 1.0 | 2026-04-18 | Initial privacy policy — data inventory, COPPA model, retention, agent decision reference |

<!-- markdown-table-prettify-ignore-end -->
