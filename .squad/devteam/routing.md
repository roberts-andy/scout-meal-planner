# Routing Rules

## How Work Gets Assigned

The coordinator reads this file to decide who handles each task.

## Explicit Routes

| Pattern | Agent | Reason |
|---------|-------|--------|
| api, server, database, auth, migration | Backend | Backend specialist |
| ui, component, page, style, css, layout | Frontend | Frontend specialist |
| test, spec, coverage, quality, bug | Tester | Testing specialist |

## Domain Routes

| Domain | Agent |
|--------|-------|
| feature | Frontend Dev (if UI), Backend Dev (if API) |
| refactor | Original author of the code |
| bug | Tester triages, specialist fixes |

## Fallback

Unmatched work goes to the Lead for triage.
