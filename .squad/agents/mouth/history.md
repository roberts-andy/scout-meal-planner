# Project Context

- **Owner:** Andy
- **Project:** scout-meal-planner — Scout troop meal planning app with React + Vite frontend, Azure Functions v4 API, Cosmos DB backend
- **Stack:** TypeScript, React, Vite, Tailwind CSS, Radix UI (shadcn/ui), TanStack Query, Azure Functions v4, Cosmos DB, Zod, Vitest, Playwright
- **Created:** 2026-04-18

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->
- `memberStatus` enum in `api/src/schemas.ts` now covers the full lifecycle: `active`, `pending`, `deactivated`, `removed`
- Auth middleware (`api/src/middleware/auth.ts`) already filters members by `status = "active"` — no changes needed to block deactivated users
- The members PUT handler (`api/src/functions/members.ts`) has guards for both role changes and status changes to protect the last active troopAdmin
- Test pattern: mock `cosmos.queryItems` multiple times in sequence for handlers that issue multiple queries (e.g., find member then count admins)
