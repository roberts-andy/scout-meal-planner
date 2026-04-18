# Frontend History

## Project Context
- **Project:** scout-meal-planner
- **Onboarded:** 2026-04-18
- **Role:** Frontend Dev

## Learnings

### 2026-04-18: Onboarded to scout-meal-planner
- Joined the squad as Frontend Dev
- Initial project setup — reviewing codebase and establishing conventions

### 2026-04-18: Feedback moderation UI (#51 → PR #68)
- Implemented moderation-aware feedback submission dialog
- Key pattern: use `mutateAsync()` instead of `mutate()` to propagate API errors to callers
- Inline `Alert variant="destructive"` in dialogs for user-actionable errors (don't just toast)
- `isModerationError()`/`getModerationReasons()` helpers parse the 422 error shape from `request()` in api.ts
- `ModerationBadge` component was already available — wired it into feedback cards
- ⚠ Branch hygiene: always verify `git branch --show-current` after checkout — changes can silently land on wrong branch
