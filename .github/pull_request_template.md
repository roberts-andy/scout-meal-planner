# Pull Request

## Description
<!-- Brief summary of what this PR does -->

## Type of Change
<!-- Check the one that applies -->

- [ ] `feature/*` → `develop` (new feature)
- [ ] `develop` → `release/*` (release prep)
- [ ] `release/*` → `main` (production release)
- [ ] `hotfix/*` → `main` (emergency fix)
- [ ] Other (describe):

## Checklist

- [ ] Code builds without errors (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] API builds without errors (`cd api && npm run build`)
- [ ] Tested locally with `.\dev.ps1`

## GitFlow Reminders

- **Features** merge into `develop` only
- **Releases** branch from `develop`, merge into both `main` and `develop`
- **Hotfixes** branch from `main`, merge into both `main` and `develop`
