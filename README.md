# Scout Meal Planner

A meal planning application for scout troops to plan, organize, and manage meals for camping trips and events. Features recipe management with cooking method variations, dynamic ingredient scaling, equipment tracking, shopping list generation, and post-event feedback collection.

## Architecture

```text
┌─────────────────────┐     ┌──────────────────────┐     ┌────────────────────┐
│  Azure Static Web   │     │  Azure Functions      │     │  Azure Cosmos DB   │
│  Apps (SWA)         │────▶│  (Flex Consumption)   │────▶│  (Serverless)      │
│                     │     │                       │     │                    │
│  React 19 SPA       │     │  Node.js 22 / TS      │     │  SQL API           │
│  Vite + Tailwind    │     │  REST API             │     │  3 containers      │
└─────────────────────┘     └──────────────────────┘     └────────────────────┘
```text

| Layer | Technology | Location |
| ----- | ---------- | -------- |
| Frontend | React 19, TypeScript, Tailwind CSS, Radix UI, React Query | `src/` |
| API | Azure Functions v4, Node.js 22, TypeScript | `api/` |
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
├── api/                          # Azure Functions API
│   ├── host.json                 # Functions runtime config (v2, extension bundle v4)
│   ├── package.json              # API dependencies (@azure/cosmos, @azure/functions, @azure/identity)
│   ├── tsconfig.json             # TypeScript config (NodeNext modules, ES2020)
│   └── src/
│       ├── index.ts              # Function registration entry point
│       ├── cosmosdb.ts           # Cosmos DB client (managed identity auth, generic CRUD helpers)
│       └── functions/
│           ├── events.ts         # GET/POST/PUT/DELETE /api/events/{id?}
│           ├── recipes.ts        # GET/POST/PUT/DELETE /api/recipes/{id?}
│           └── feedback.ts       # CRUD /api/feedback/{id?} + GET /api/feedback/event/{eventId}
│
├── server/                       # Local dev Express server (alternative to Azure Functions)
│   ├── index.ts                  # Express app (port 3001, CORS to localhost:5173)
│   ├── cosmosdb.ts               # Cosmos DB client (supports emulator mode)
│   ├── tsconfig.json
│   └── routes/
│       ├── events.ts             # Express router for events
│       ├── recipes.ts            # Express router for recipes
│       └── feedback.ts           # Express router for feedback
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

- [Node.js 22+](https://nodejs.org/)
- [Azure Cosmos DB Emulator](https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-develop-emulator) (or a Cosmos DB account)
- [Azure Functions Core Tools v4](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local) (optional, for running Functions locally)
- [Azure Static Web Apps CLI](https://azure.github.io/static-web-apps-cli/) (optional, for full SWA emulation)

### Quick Start (Express dev server)

```bash
# Install all dependencies
npm install
cd api && npm install && cd ..

# Start Cosmos DB Emulator, then:
export COSMOS_EMULATOR=true

# Start frontend (Vite) + API (Express) together
npm run dev:all
```

This starts:

- Frontend at `http://localhost:5173` (Vite dev server with HMR)
- API at `http://localhost:3001/api` (Express with Cosmos DB emulator)

Set `VITE_API_URL=http://localhost:3001/api` in a `.env` file so the frontend talks to the Express server.

### Alternative: Azure Functions + SWA CLI

```bash
# Start the full SWA emulation (matches production more closely)
npm run dev:swa
```

This uses the SWA CLI to proxy both the frontend and the Functions API together.

### Available Scripts

| Script | Description |
| ------ | ----------- |
| `npm run dev` | Vite dev server only (frontend at :5173) |
| `npm run dev:server` | Express API server only (API at :3001) |
| `npm run dev:all` | Both frontend and API in parallel |
| `npm run dev:swa` | SWA CLI with Functions API |
| `npm run build` | TypeScript check + Vite production build |
| `npm run lint` | ESLint |
| `npm run preview` | Preview production build locally |

### Environment Variables

| Variable | Where | Description |
| -------- | ----- | ----------- |
| `COSMOS_EMULATOR` | server | Set to `true` to use Cosmos DB Emulator |
| `COSMOS_ENDPOINT` | api/server | Cosmos DB account endpoint |
| `COSMOS_CONNECTION_STRING` | server | Alternative to endpoint + identity auth |
| `COSMOS_DATABASE` | api | Database name (default: `scout-meal-planner`) |
| `VITE_API_URL` | frontend (.env) | API base URL (default: `/api`) |
| `API_PORT` | server | Express server port (default: `3001`) |

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
| GET | `/api/recipes` | List all recipes |
| GET | `/api/recipes/{id}` | Get recipe by ID |
| POST | `/api/recipes` | Create recipe |
| PUT | `/api/recipes/{id}` | Update recipe |
| DELETE | `/api/recipes/{id}` | Delete recipe |
| GET | `/api/feedback` | List all feedback |
| GET | `/api/feedback/event/{eventId}` | Get feedback for an event |
| POST | `/api/feedback` | Create feedback |
| PUT | `/api/feedback/{id}` | Update feedback |
| DELETE | `/api/feedback/{id}?eventId={eid}` | Delete feedback (requires eventId for partition key) |

## Data Model

### Event

Multi-day camping trip with daily meal schedule. Contains nested `EventDay` → `Meal` structure.

### Recipe

Cooking recipe with multiple variations (one per cooking method). Supports versioning with event-specific snapshots and version diffing.

### MealFeedback

Post-event feedback linked to a specific event, meal, and recipe. Includes star ratings (taste, difficulty, portion size) and free-form comments.

## License

MIT
