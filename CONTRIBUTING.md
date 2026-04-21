# Contributing to Scout Meal Planner

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite, TypeScript (strict mode), Tailwind CSS, Radix UI / shadcn/ui, TanStack Query |
| **Backend** | Python FastAPI, Pydantic, Uvicorn |
| **Database** | Azure Cosmos DB |
| **Auth** | MSAL / Azure Entra ID (frontend), JWT validation (API) |
| **Deploy** | Azure Static Web Apps (frontend), Azure App Service (API) |
| **CI** | GitHub Actions — build, test, lint, CodeQL |

## Local Development

The recommended setup uses the **devcontainer** (VS Code / GitHub Codespaces), which provisions Node, Python, and a Cosmos DB emulator automatically.

```bash
# Devcontainer handles setup via postCreateCommand:
npm install
cd api && pip install -r requirements.txt -r requirements-dev.txt
```

To run locally outside the devcontainer, you need:

- **Node.js** (see `.nvmrc` for version)
- **Python 3.13+**
- **Azure Cosmos DB Emulator** running on `https://localhost:8081/`

See [README.md](README.md#local-development) for full setup instructions.

## Build, Test & Lint

Run the full validation before opening a PR:

```bash
# Frontend
npm run build          # Build frontend
npm test               # Vitest unit tests
npm run test:watch     # Watch mode
npm run lint           # ESLint

# API
cd api && python -m pytest   # pytest unit tests
```

## Branching Strategy (Trunk-Based)

All work happens on short-lived branches off `main`. There is no `develop` branch.

### Branch Naming

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feature/` | New features | `feature/meal-photos` |
| `fix/` | Bug fixes | `fix/shopping-list-bug` |
| `hotfix/` | Emergency production fixes | `hotfix/fix-login` |
| `docs/` | Documentation changes | `docs/update-prd` |
| `copilot/` | Copilot agent work (automated) | `copilot/add-feature-flags` |
| `issue-<number>-*` | Issue-linked work | `issue-42-add-headcount` |

### Workflow

```bash
# Start from main
git checkout main && git pull origin main
git checkout -b feature/my-feature

# ... make changes, commit ...

# Push and create PR targeting main
git push -u origin feature/my-feature
```

## Pull Requests

- Target `main` with a clear description of what changed and why.
- **Always include `Closes #<issue-number>`** in the PR description so linked issues auto-close on merge.
- All PRs require the **Build & Test** check to pass before merging.
- PRs are squash-merged; branches are deleted automatically after merge.

## CI/CD

| Trigger | What runs |
|---------|-----------|
| **PR to `main`** | Build & Test (frontend build + tests, API tests), CodeQL, GitGuardian |
| **Push to `copilot/**` or `docs/**`** | Build & Test (satisfies required checks for agent PRs) |
| **Push to `main`** | Deploy frontend to Azure Static Web Apps, deploy API to Azure App Service |

## Copilot Agents

This repo uses **GitHub Copilot coding agents** for automated development. Agents are assigned issues, create branches (`copilot/*`), implement changes, and open PRs.

When reviewing agent PRs:

- Verify the implementation matches the issue requirements and the [PRD](PRD.md).
- Check for bugs, security issues, and missing error handling.
- Use `@copilot` comments to request changes — the agent will address feedback automatically.
- Agent PRs follow the same CI and review requirements as human PRs.

See [`.github/copilot-instructions.md`](.github/copilot-instructions.md) for the full agent workflow and coding conventions.
