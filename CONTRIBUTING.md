# Contributing to Scout Meal Planner

## Branching Strategy (Trunk-Based)

This project uses a trunk-based workflow. All work happens on short-lived branches off `main`.

### Branch Overview

| Branch | Purpose | Merges Into |
| ------ | ------- | ----------- |
| `main` | Production-ready code. Deployed to Azure on push. | — |
| `feature/*` | New features and enhancements. | `main` |
| `fix/*` | Bug fixes. | `main` |
| `hotfix/*` | Emergency production fixes. | `main` |

### Workflow

```text
feature/add-meal-photos ──→ main (via PR)
fix/shopping-list-bug   ──→ main (via PR)
hotfix/fix-login        ──→ main (via PR)
```

### Working on a Feature

```bash
# Start from main
git checkout main
git pull origin main
git checkout -b feature/my-feature

# ... make changes, commit ...

# Push and create PR targeting main
git push -u origin feature/my-feature
# Open PR: feature/my-feature → main
```

### Branch Naming Conventions

- `feature/short-description` — new features
- `fix/short-description` — bug fixes
- `hotfix/short-description` — emergency production fixes

### CI/CD

- **All PRs** (to `main`): CI runs build + tests
- **Push to `main`**: Deploys to production (Azure Static Web Apps + Azure Functions)

## Local Development

```powershell
.\dev.ps1
```

Requires fnm + Node.js 20 LTS (pinned via `.nvmrc`) and the Azure Cosmos DB Emulator running on `https://localhost:8081/`. See [README.md](README.md#local-development) for full setup instructions.

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```
