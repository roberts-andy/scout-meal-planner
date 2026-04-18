# Decisions

Shared brain for the team. All agents should read this before every session.

## Active Decisions

### Member Status Lifecycle (Task #58)
**Author:** Mouth (Backend Dev)  
**Date:** 2026-04-18  
**Issue:** #58

Member status uses a four-value enum: `active`, `pending`, `deactivated`, `removed`.
- **active** — full access, default for new members
- **pending** — awaiting approval (pre-existing)
- **deactivated** — blocked from access but record preserved (reversible)
- **removed** — hard block, record kept for audit trail

**Rationale:** Auth middleware already filters on `status = "active"`, so deactivated/removed members are automatically locked out. Separate deactivated and removed gives admins a soft-delete option. Last-admin guard prevents accidental lockout.

**Impact:** Frontend needs to show status in member list and provide UI to change it. FR-030 can build directly on this schema.

---

### Dietary Notes as Free-Text Field (Task #40, FR-006)
**Author:** Data (Frontend Dev)  
**Date:** 2026-04-18  
**Issue:** #40

Dietary restrictions implemented as a single free-text `dietaryNotes` string field on the Meal type, with a Textarea input in the Add Meal dialog. Displayed on meal cards with an amber Warning icon.

**Rationale:** Free-text is simplest for MVP — scoutmasters can type "nut allergy, vegetarian option needed" etc. No predefined tags yet keeps it flexible.

**Future considerations:** Could add structured dietary tags (checkboxes for common restrictions) if users want filtering/search. Could add dietary notes editing on existing meals.
