# Contributing to Scout Meal Planner

## Branching Strategy (GitFlow)

This project follows the [GitFlow](https://nvie.com/posts/a-successful-git-branching-model/) branching model.

### Branch Overview

| Branch | Purpose | Merges Into |
| ------ | ------- | ----------- |
| `main` | Production-ready code. Deployed to Azure. | — |
| `develop` | Integration branch for completed features. | `main` (via release) |
| `feature/*` | New features and enhancements. | `develop` |
| `release/*` | Release stabilization and prep. | `main` and `develop` |
| `hotfix/*` | Emergency production fixes. | `main` and `develop` |

### Workflow

```text
feature/add-meal-photos ──→ develop ──→ release/1.2.0 ──→ main
                                                            ↑
                                          hotfix/fix-login ─┘
```

### Working on a Feature

```bash
# Start from develop
git checkout develop
git pull origin develop
git checkout -b feature/my-feature

# ... make changes, commit ...

# Push and create PR targeting develop
git push -u origin feature/my-feature
# Open PR: feature/my-feature → develop
```

### Creating a Release

```bash
# Branch from develop when ready to release
git checkout develop
git pull origin develop
git checkout -b release/1.2.0

# ... final fixes, version bumps ...

# Open PR: release/1.2.0 → main
# After merge to main, also merge back into develop
git checkout develop
git merge release/1.2.0
git push origin develop
```

### Hotfixes

```bash
# Branch from main for urgent fixes
git checkout main
git pull origin main
git checkout -b hotfix/fix-critical-bug

# ... fix the bug ...

# Open PR: hotfix/fix-critical-bug → main
# After merge to main, also merge back into develop
git checkout develop
git merge hotfix/fix-critical-bug
git push origin develop
```

### Branch Naming Conventions

- `feature/short-description` — new features
- `release/X.Y.Z` — release prep (semver)
- `hotfix/short-description` — emergency fixes

### CI/CD

- **All PRs** (to `develop` or `main`): CI runs build + tests
- **Push to `main`**: Deploys to production (Azure Static Web Apps + Azure Functions)
- **Push to `develop`**: CI only (no deployment)

## Local Development

```powershell
.\dev.ps1
```

Requires Node.js 22+ and Azure Cosmos DB Emulator. See [README.md](README.md) for details.

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```
