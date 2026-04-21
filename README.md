# Scout Meal Planner

A meal planning application for scout troops to plan, organize, and manage meals for camping trips and events. Features recipe management with cooking method variations, dynamic ingredient scaling, equipment tracking, shopping list generation, and post-event feedback collection.

## Architecture

```text
┌─────────────────────┐     ┌──────────────────────┐     ┌────────────────────┐
│  Azure Static Web   │     │  FastAPI Backend      │     │  Azure Cosmos DB   │
│  Apps (SWA)         │────▶│  (Azure App Service)  │────▶│  (Serverless)      │
│                     │     │                       │     │                    │
│  React 19 SPA       │     │  Python 3.13          │     │  SQL API           │
│  Vite + Tailwind    │     │  REST API             │     │  3 containers      │
└─────────────────────┘     └──────────────────────┘     └────────────────────┘
```text

| Layer | Technology | Location |
| ----- | ---------- | -------- |
| Frontend | React 19, TypeScript, Tailwind CSS, Radix UI, React Query | `src/` |
| API | FastAPI, Python 3.13 | `api/` |
| Database | Azure Cosmos DB (serverless, SQL API) | 3 containers: `events`, `recipes`, `feedback` |
| Hosting | Azure Static Web Apps (Standard) | CDN-distributed SPA |
| Infrastructure | Bicep (subscription-scoped) | `infra/` |
| CI/CD | GitHub Actions (OIDC auth) | `.github/workflows/` |

## Features

- **Event & Meal Scheduling** — Create multi-day camping trips, define daily meals (breakfast/lunch/dinner/snack), assign recipes
- **Recipe Library** — Recipes with multiple cooking method variations (open fire, camp stove, dutch oven, skillet, grill, no-cook), search/filter/sort, clone recipes
- **Dynamic Scaling** — Automatically scale ingredient quantities by scout count with practical fraction display (1/4, 1/3, 1/2, etc.)
- **Recipe Versioning** — Track recipe changes over time, event-specific versions, diff comparison, revert to previous versions
- **Shopping Lists** — Auto-generated, consolidated by ingredient across all meals, categorized (produce, meat, dairy, pantry, etc.)
- **Equipment Tracking** — Aggregate required cooking equipment across all meals with duplicate consolidation
- **Feedback System** — Post-event ratings (taste, difficulty, portion size), comments, photos, linked to specific meals/recipes

## Project Structure

```text
scout-meal-planner/
├── src/                          # Frontend (React SPA)
│   ├── main.tsx                  # App bootstrap (React Query, Error Boundary)
│   ├── App.tsx                   # Root component, tab navigation, data orchestration
│   ├── components/               # UI components
│   │   ├── EventList.tsx         # Event grid with create/delete
│   │   ├── EventDetail.tsx       # Event detail with tabs (schedule, shopping, equipment, feedback)
│   │   ├── EventSchedule.tsx     # Daily meal grid, recipe assignment
│   │   ├── EventShoppingList.tsx # Generated shopping list by category
│   │   ├── EventEquipment.tsx    # Equipment checklist
│   │   ├── EventFeedback.tsx     # Feedback form and display
│   │   ├── RecipeLibrary.tsx     # Recipe grid with search/filter/sort
│   │   ├── CreateRecipeDialog.tsx    # Recipe create/edit form
│   │   ├── RecipeDetailDialog.tsx    # Recipe detail view
│   │   ├── RecipeVersionHistory.tsx  # Version timeline and diff comparison
│   │   ├── CreateEventDialog.tsx     # Event creation form
│   │   ├── EditEventDialog.tsx       # Event metadata editor
│   │   ├── StarRating.tsx            # Interactive star rating component
│   │   ├── VersioningTest.tsx        # Recipe versioning diagnostics
│   │   └── ui/                       # Radix UI component primitives
│   ├── hooks/                    # React Query hooks
│   │   ├── useEvents.ts          # Events CRUD with optimistic updates
│   │   ├── useRecipes.ts         # Recipes CRUD with optimistic updates
│   │   ├── useFeedback.ts        # Feedback CRUD with optimistic updates
│   │   └── use-mobile.ts         # Responsive breakpoint hook
│   ├── lib/                      # Shared utilities
│   │   ├── api.ts                # HTTP client (fetch wrapper for /api endpoints)
│   │   ├── types.ts              # TypeScript interfaces (Event, Recipe, Meal, Feedback, etc.)
│   │   ├── helpers.ts            # Business logic (scaling, shopping lists, equipment, versioning)
│   │   └── utils.ts              # Tailwind class merge utility
│   └── styles/
│       └── theme.css             # CSS custom properties (Radix color tokens)
│
├── api/                          # FastAPI backend
│   ├── app/                      # Application package
│   │   ├── main.py               # FastAPI app bootstrap
│   │   ├── routers/              # API routers (/events, /recipes, /feedback, etc.)
│   │   ├── middleware/           # Auth, RBAC, moderation middleware
│   │   ├── cosmosdb.py           # Cosmos DB client + data access helpers
│   │   └── schemas.py            # Pydantic request/response schemas
│   ├── tests/                    # Backend unit tests (pytest)
│   ├── requirements.txt          # Runtime dependencies
│   └── requirements-dev.txt      # Test/dev dependencies
│
├── infra/                        # Azure infrastructure (Bicep)
│   ├── main.bicep                # Subscription-scoped deployment orchestrator
│   ├── resources.bicep           # All Azure resources (Cosmos, Storage, Functions, SWA, RBAC)
│   ├── parameters.json           # Deployment parameter values
│   └── deploy.sh                 # Manual deployment script
│
├── .github/workflows/
│   ├── deploy.yml                # CI/CD: Build + deploy frontend (SWA) and API (Functions)
│   └── infra.yml                 # Manual: Deploy Azure infrastructure via Bicep
│
├── vite.config.ts                # Vite build config (React SWC, Tailwind, path aliases)
├── tailwind.config.js            # Tailwind theme (outdoor color palette, responsive breakpoints)
├── staticwebapp.config.json      # SWA routing (SPA fallback, API proxy)
├── tsconfig.json                 # Frontend TypeScript config
├── package.json                  # Frontend dependencies and scripts
├── PRD.md                        # Product requirements document
└── theme.json                    # Design tokens (colors, fonts, spacing)
```

## Local Development

### Prerequisites

| Tool | Version | Install |
| ---- | ------- | ------- |
| **fnm** (Fast Node Manager) | latest | `winget install Schniz.fnm` (Windows) or [fnm docs](https://github.com/Schniz/fnm#installation) |
| **Node.js** | 20 LTS (pinned via `.nvmrc`) | Installed automatically by fnm: `fnm install 20` |
| **Azure Cosmos DB Emulator** | latest | [Download](https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-develop-emulator) — must be running on `https://localhost:8081/` before starting the dev server |
| **Python** | 3.13 | Required for the FastAPI backend (`api/`). Install via [python.org](https://www.python.org/downloads/) or your package manager |
| **Azure Static Web Apps CLI** | v2 | Installed as a project dependency (`@azure/static-web-apps-cli` in root `package.json`) — no global install needed |

#### fnm setup

fnm auto-switches to the Node version in `.nvmrc` when you `cd` into the project. Add this to your PowerShell profile (`$PROFILE.CurrentUserAllHosts`):

```powershell
fnm env --use-on-cd --shell power-shell | Out-String | Invoke-Expression
```

> **Note:** `dev.ps1` activates fnm automatically, so this works even with `--noprofile` shells.

#### Cosmos DB Emulator

Start the emulator before running `dev.ps1`. The emulator's well-known connection string is pre-filled in `.env.example` — just copy it to `.env`.

To switch to a remote Cosmos DB account later, replace `COSMOS_CONNECTION_STRING` in `.env` with your real connection string and remove `NODE_TLS_REJECT_UNAUTHORIZED=0`.

### Quick Start

```powershell
# 1. Clone and enter the project (fnm auto-switches to Node 20 if set up)
cd scout-meal-planner
node --version  # should print v20.x

# 2. Copy the env template and fill in your values
cp .env.example .env
# Edit .env → set VITE_ENTRA_CLIENT_ID and ENTRA_CLIENT_ID to your app's client ID
# The Cosmos DB Emulator connection string is pre-filled — no changes needed for local dev

# 3. Start the Cosmos DB Emulator (Windows system tray → Azure Cosmos DB Emulator → Start)

# 4. Launch everything
.\dev.ps1
```

This starts:
- **Vite** dev server on `http://localhost:5000`
- **Azure Functions** host on `http://localhost:7071`
- **SWA CLI** emulator on **`http://localhost:4280`** (use this URL) — proxies `/api` to Functions and serves the frontend from Vite

### Available Scripts

| Script | Description |
| ------ | ----------- |
| `.\dev.ps1` | **Recommended.** Loads `.env`, activates fnm, starts SWA CLI + Vite + Functions |
| `npm run dev` | Vite dev server only (frontend at `:5000`, no API) |
| `npm run dev:swa` | SWA CLI + Vite + Functions (same as `dev.ps1` but without `.env` loading) |
| `npm run build` | TypeScript check + Vite production build |
| `npm run lint` | ESLint |
| `npm run test` | Run Vitest unit tests once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:coverage` | Run tests with v8 coverage report |
| `npm run test:e2e` | Run Playwright end-to-end tests |
| `npm run preview` | Preview production build locally |

### Environment Variables

| Variable | Where | Description |
| -------- | ----- | ----------- |
| `VITE_ENTRA_CLIENT_ID` | frontend (.env) | Entra app registration client ID |
| `VITE_API_URL` | frontend (.env) | API base URL (default: `/api`) |
| `COSMOS_ENDPOINT` | api | Cosmos DB account endpoint (with managed identity) |
| `COSMOS_CONNECTION_STRING` | api | Alternative to endpoint + identity auth |
| `COSMOS_DATABASE` | api | Database name (default: `scout-meal-planner`) |
| `ENTRA_CLIENT_ID` | api | Entra app client ID for JWT audience validation |

## Deployment

### Infrastructure (one-time setup)

Infrastructure is defined in Bicep and deployed via GitHub Actions:

```bash
# Trigger manually from GitHub Actions UI or CLI
gh workflow run infra.yml
```

This creates:

- Resource group `rg-scout-meal-planner` in `centralus`
- Cosmos DB account (serverless) with 3 containers
- Storage account (identity-based auth, no shared keys)
- App Service Plan (Flex Consumption / FC1)
- Function App with system-assigned managed identity
- Static Web App (Standard tier)
- RBAC role assignments (Cosmos data contributor, Storage blob/queue/table roles)

### Application Deployment

Code deploys automatically on push to `main` (excluding `infra/` and workflow changes):

```bash
# Or trigger manually
gh workflow run deploy.yml
```

The workflow:

1. Builds frontend with Vite → deploys to SWA
2. Builds API with TypeScript → zips → deploys to Function App via `config-zip`

### Required GitHub Secrets

| Secret | Description |
| ------ | ----------- |
| `AZURE_CLIENT_ID` | Service principal app ID (for OIDC) |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | SWA deployment token (set by infra workflow) |

## API Endpoints

All endpoints are served under `/api` and proxied through SWA to the Function App.

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/api/events` | List all events |
| GET | `/api/events/{id}` | Get event by ID |
| POST | `/api/events` | Create event |
| PUT | `/api/events/{id}` | Update event |
| DELETE | `/api/events/{id}` | Delete event |
| GET | `/api/events/{id}/share` | Get current share link state for event |
| POST | `/api/events/{id}/share` | Generate/regenerate share link token |
| DELETE | `/api/events/{id}/share` | Revoke share link token |
| GET | `/api/share/{token}` | Public read-only shared event plan |
| GET | `/api/recipes` | List all recipes |
| GET | `/api/recipes/{id}` | Get recipe by ID |
| POST | `/api/recipes` | Create recipe |
| PUT | `/api/recipes/{id}` | Update recipe |
| DELETE | `/api/recipes/{id}` | Delete recipe |
| GET | `/api/feedback` | List all feedback |
| GET | `/api/feedback/event/{eventId}` | Get feedback for an event |
| POST | `/api/feedback` | Create feedback |
| PUT | `/api/feedback/{id}` | Update feedback |
| DELETE | `/api/feedback/{id}` | Delete feedback |

## Data Model

### Event

Multi-day camping trip with daily meal schedule. Contains nested `EventDay` → `Meal` structure.

### Recipe

Cooking recipe with multiple variations (one per cooking method). Supports versioning with event-specific snapshots and version diffing.

### MealFeedback

Post-event feedback linked to a specific event, meal, and recipe. Includes star ratings (taste, difficulty, portion size) and free-form comments.

## License

MIT
