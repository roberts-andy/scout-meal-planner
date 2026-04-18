# Backend History

## Project Context
- **Project:** scout-meal-planner
- **Onboarded:** 2026-04-18
- **Role:** Backend Dev

## Learnings

### 2026-04-18: Onboarded to scout-meal-planner
- Joined the squad as Backend Dev
- Initial project setup — reviewing codebase and establishing conventions

### Issue #59: Deactivate/remove members with audit trail
- Enhanced `PUT /api/members/:id` with unified last-admin guard covering both role demotion and status changes
- Added audit trail fields (`statusChangedAt`, `statusChangedBy`, `statusChangeReason`, `previousStatus`) for deactivation/removal
- Added `reason` field to `updateMemberSchema` for documenting status changes
- Expanded tests from 6 to 19 (role changes + deactivation/removal + reactivation + RBAC)
- PR #66 (draft) depends on #61 (deactivated status enum from #58)
- Learned: `edit` tool works reliably with CRLF files; `git checkout` can silently stay on wrong branch when working tree is dirty from other agents
