# Copilot Coding Agent Instructions

## Project Overview

Scout Meal Planner — a React + Vite frontend with a Python FastAPI backend, backed by Azure Cosmos DB. Deployed as an Azure Static Web App.

## Setup

Dependencies are auto-installed by `postCreateCommand` in the devcontainer. If you need to reinstall:

```bash
npm install
cd api && pip install -r requirements.txt -r requirements-dev.txt
```

## Build

```bash
# Frontend
npm run build
```

## Test

```bash
# Frontend unit tests
npm test

# API unit tests
cd api && python -m pytest
```

## Lint

```bash
npm run lint
```

## Project Structure

- `src/` — React frontend (Vite, Tailwind CSS, Radix UI, TanStack Query)
- `api/` — Python FastAPI backend (Cosmos DB)
- `api/app/routers/` — Individual API endpoint routers
- `api/app/middleware/` — Auth, RBAC, and content moderation middleware
- `infra/` — Bicep infrastructure-as-code
- `tests/e2e/` — Playwright end-to-end tests

## Key Conventions

- Node 20 LTS (pinned in `.nvmrc`)
- Trunk-based branching: all work on short-lived branches off `main`, no `develop` branch
- TypeScript strict mode for frontend
- Frontend tests use Vitest; API tests use pytest
- API schemas defined with Pydantic in `api/app/schemas.py`
- Frontend auth via MSAL (Microsoft Entra ID, /consumers endpoint)
- API auth via JWT validation middleware (`api/app/middleware/auth.py`)
- UI components use shadcn/ui (Radix + Tailwind) in `src/components/ui/`
- Data fetching uses TanStack Query hooks in `src/hooks/`
- API client functions live in `src/lib/api.ts`

## Agent Workflow

When assigned an issue:

1. Read the issue carefully. If it references other files or features, explore them first.
2. Create a branch named `issue-<number>-<short-description>` from `main`.
3. Implement the change following the conventions above.
4. For API changes: add or update Pydantic schemas in `api/app/schemas.py`, add the router in `api/app/routers/`, and write tests in `api/tests/`.
5. For frontend changes: use existing UI components from `src/components/ui/`, add hooks in `src/hooks/`, and write tests for non-trivial logic.
6. Run the full validation: `npm run build && npm test && npm run lint && cd api && python -m pytest`.
7. All builds and tests must pass before opening a PR.
8. Open a PR targeting `main` with a clear description of what changed and why.
9. **Always include `Closes #<issue-number>` in the PR description** so the linked issue is automatically closed when the PR is merged. If the PR addresses multiple issues, include a closing keyword for each (e.g., `Closes #12, Closes #34`).

## Security & Data Integrity Patterns

- **Ownership checks**: Any endpoint that modifies a user-created resource (feedback, recipes) must verify the requesting user is the original author OR has an admin-level permission. Never rely solely on role-based permission for user-owned data.
- **Optimistic concurrency**: Any read-modify-write operation on Cosmos DB must use ETag-based concurrency control (`if_match=existing["_etag"]`) with a retry loop. See `api/app/routers/event_packed.py` for the reference pattern.
- **Identity propagation**: When creating member/user records, always include `userId`, `email`, and `displayName` from the authenticated token claims. Missing identity fields break downstream auth resolution.
- **Cascade deletes**: When deleting a parent entity (event, recipe), query and delete all child records (feedback, etc.) in the same operation.
- **Secrets and PII**: Never hardcode real email addresses, names, or credentials in source. Use `@example.com` domains and placeholder names for seed/test data.
- **Error responses**: Use `raise HTTPException(status_code=..., detail="...")` for all error paths. Do not use `JSONResponse` for errors. Import `HTTPException` at module level.
- **Pydantic update models**: Update schemas must be separate from create schemas with all fields optional. Use `model_dump(exclude_unset=True)` to avoid overwriting server-managed fields.

## Frontend Security

- MSAL cache must use `sessionStorage`, never `localStorage`.
- Debug/verbose logging must be gated to development mode (`import.meta.env.DEV`).
- Sanitize user-controlled strings before interpolating into email subjects, headers, or URLs (strip newlines, enforce length limits).

## Do Not

- Do not modify `infra/` (Bicep) files unless the issue explicitly requests infrastructure changes.
- Do not commit `.env` files or secrets.
- Do not add new dependencies without a clear reason stated in the PR description.
- Do not change the auth middleware (`api/app/middleware/auth.py`) unless the issue specifically requires it.

## Cosmos DB

The devcontainer runs the Azure Cosmos DB Linux emulator as a Docker Compose service. TLS settings are pre-configured in `docker-compose.yml`. The `COSMOS_CONNECTION_STRING` must be set as a **Codespaces repo secret** (Settings > Secrets and variables > Codespaces):

The connection string is documented at [documented well-known key](https://learn.microsoft.com/en-us/azure/cosmos-db/emulator#authentication) for the emulator. The hostname `cosmos` resolves to the emulator container via Docker DNS.

## Environment Variables

The app requires environment variables to run locally. See `.env.example` and `api/.env.example`. **Do not commit secrets.** For CI/automated tasks, the build and test commands above work without env vars (Cosmos DB is not required for unit tests).
