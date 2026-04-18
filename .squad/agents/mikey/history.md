# Project Context

- **Owner:** Andy
- **Project:** scout-meal-planner — Scout troop meal planning app with React + Vite frontend, Azure Functions v4 API, Cosmos DB backend
- **Stack:** TypeScript, React, Vite, Tailwind CSS, Radix UI (shadcn/ui), TanStack Query, Azure Functions v4, Cosmos DB, Zod, Vitest, Playwright
- **Created:** 2026-04-18

## Learnings

### Issue Triage (2026-01-29)
- **18 non-epic issues triaged** across 4 areas: admin (5), compliance (5), feedback (3), sharing (5)
- **Content moderation (#53) is critical path** — gates feedback, admin review, and compliance features
- **Partial work density is high** — 5 of 18 issues are partially implemented and ready for completion (58, 57, 48, 47, 39)
- **Compliance cluster (#54, #56, #44)** forms a natural grouping: PII audit → delete data → member management
- **Full-stack ownership split:** 11 frontend-primary, 7 backend-primary; most MUST-have issues benefit from early Backend work on auth/schemas
- **Dependency chains are tight:** Admin chain (4 sequential), Compliance chain (3-tier), Sharing chain (2-3 issues)
- **Email service decision pending** for #44 (ACS vs SendGrid) — needed for infrastructure planning
