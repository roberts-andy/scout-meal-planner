# Project Context

- **Owner:** Andy
- **Project:** scout-meal-planner — Scout troop meal planning app with React + Vite frontend, Azure Functions v4 API, Cosmos DB backend
- **Stack:** TypeScript, React, Vite, Tailwind CSS, Radix UI (shadcn/ui), TanStack Query, Azure Functions v4, Cosmos DB, Zod, Vitest, Playwright
- **Created:** 2026-04-18

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

- Meals are nested inside Event.days[].meals[] — no separate meal API endpoint. Meal CRUD goes through eventsApi.update().
- The Add Meal dialog lives in EventSchedule.tsx. Meal cards also render there.
- Backend schema (api/src/schemas.ts) already had `dietaryNotes` on `mealSchema` before the frontend was wired up.
- Phosphor Icons are the icon library. Warning icon used for dietary notes display.
- Textarea component from shadcn/ui available at `@/components/ui/textarea`.
- ESLint config is missing (no eslint.config.js) — `npm run lint` fails. Pre-existing issue.
- Frontend tests: 66 passing (Vitest). API tests: 79 passing.
