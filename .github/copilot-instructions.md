# Copilot Coding Agent Instructions

## Project Overview

Scout Meal Planner — a React + Vite frontend with an Azure Functions v4 (Node.js) API backend, backed by Azure Cosmos DB. Deployed as an Azure Static Web App.

## Setup

Dependencies are auto-installed by `postCreateCommand` in the devcontainer. If you need to reinstall:

```bash
npm install
cd api && npm install
```

## Build

```bash
# Frontend
npm run build

# API
cd api && npm run build
```

## Test

```bash
# Frontend unit tests
npm test

# API unit tests
cd api && npm test
```

## Lint

```bash
npm run lint
```

## Project Structure

- `src/` — React frontend (Vite, Tailwind CSS, Radix UI, TanStack Query)
- `api/` — Azure Functions v4 API (TypeScript, Cosmos DB)
- `api/src/functions/` — Individual Azure Function endpoints
- `api/src/middleware/` — Auth and RBAC middleware
- `infra/` — Bicep infrastructure-as-code
- `tests/e2e/` — Playwright end-to-end tests

## Key Conventions

- Node 20 LTS (pinned in `.nvmrc`)
- Trunk-based branching: all work on short-lived branches off `main`, no `develop` branch
- TypeScript strict mode everywhere
- Tests use Vitest (unit) and Playwright (e2e)
- API schemas defined with Zod in `api/src/schemas.ts`
- Frontend auth via MSAL (Microsoft Entra ID, /consumers endpoint)
- API auth via JWT validation middleware (`api/src/middleware/auth.ts`)
- UI components use shadcn/ui (Radix + Tailwind) in `src/components/ui/`
- Data fetching uses TanStack Query hooks in `src/hooks/`
- API client functions live in `src/lib/api.ts`

## Agent Workflow

When assigned an issue:

1. Read the issue carefully. If it references other files or features, explore them first.
2. Create a branch named `issue-<number>-<short-description>` from `main`.
3. Implement the change following the conventions above.
4. For API changes: add or update Zod schemas in `api/src/schemas.ts`, add the function in `api/src/functions/`, and write tests alongside (`*.test.ts`).
5. For frontend changes: use existing UI components from `src/components/ui/`, add hooks in `src/hooks/`, and write tests for non-trivial logic.
6. Run the full validation: `npm run build && npm test && npm run lint && cd api && npm run build && npm test`.
7. All builds and tests must pass before opening a PR.
8. Open a PR targeting `main` with a clear description of what changed and why.

## Do Not

- Do not modify `infra/` (Bicep) files unless the issue explicitly requests infrastructure changes.
- Do not commit `.env` files or secrets.
- Do not add new dependencies without a clear reason stated in the PR description.
- Do not change the auth middleware (`api/src/middleware/auth.ts`) unless the issue specifically requires it.

## Cosmos DB

The devcontainer runs the Azure Cosmos DB Linux emulator as a Docker Compose service. TLS settings are pre-configured in `docker-compose.yml`. The `COSMOS_CONNECTION_STRING` must be set as a **Codespaces repo secret** (Settings > Secrets and variables > Codespaces):

The connection string is documented at [documented well-known key](https://learn.microsoft.com/en-us/azure/cosmos-db/emulator#authentication) for the emulator. The hostname `cosmos` resolves to the emulator container via Docker DNS.

## Environment Variables

The app requires environment variables to run locally. See `.env.example` and `api/.env.example`. **Do not commit secrets.** For CI/automated tasks, the build and test commands above work without env vars (Cosmos DB is not required for unit tests).
