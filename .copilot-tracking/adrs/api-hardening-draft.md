# ADR: API Security Hardening — Input Validation, Tenant Isolation, and Defense Headers

**Status**: Draft  
**Date**: 2026-04-17  
**Decision Makers**: Andy Roberts  

## Context

A Well-Architected Framework (WAF) review of the Scout Meal Planner identified several
security and operational gaps in the Azure Functions API layer. All five HTTP function
handlers (events, recipes, feedback, troops, members) accepted untyped request bodies
cast to `any` and wrote them directly to Cosmos DB. This exposed the system to:

- **Mass assignment** — authenticated users could inject arbitrary fields (e.g.,
  overwriting `createdBy`, `createdAt`, or adding unexpected properties) into any
  document.
- **ID mismatch on updates** — PUT handlers did not verify that the URL route `id`
  matched the body's `id`, and did not confirm the target document existed in the
  caller's troop partition before replacing it.
- **Missing security headers** — the Static Web App served responses without standard
  browser security headers (CSP, X-Frame-Options, Content-Type-Options).
- **No health endpoint** — no way to verify Cosmos DB connectivity for deployment
  smoke tests or backend health probes.

The system targets ~50 users across a small number of scout troops. While the scale is
modest, the data involves minors' activity planning, and the multi-tenant model
(partition isolation by `troopId`) must be airtight regardless of user count.

## Decision

Harden the API layer with four coordinated changes:

### 1. Schema validation with Zod at every write endpoint

Add a centralized `schemas.ts` module defining Zod schemas for every POST and PUT
payload. Each handler parses the request body through `safeParse()` before any database
operation. Invalid requests return HTTP 400 with field-level error details.

**Why Zod**: Already well-supported in the Node.js + TypeScript ecosystem, zero
runtime dependencies, composable schemas that mirror the existing `types.ts`
definitions. Alternatives considered:

| Option | Pros | Cons |
|--------|------|------|
| Zod | Type inference, composable, zero deps | New dependency |
| Manual checks | No dependency | Verbose, error-prone, incomplete |
| JSON Schema (ajv) | Standard format | Heavier, weaker TS integration |
| io-ts | FP-oriented, strong types | Steeper learning curve, less ecosystem momentum |

### 2. Server-side ID generation and read-before-write on updates

POST handlers generate `id` server-side via `crypto.randomUUID()` and stamp all audit
fields (`createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `troopId`) from the auth
context — never from the client payload.

PUT handlers fetch the existing document first, merge only the validated fields from the
schema, then explicitly set `id` from the URL param and `troopId` from the auth context
before writing. This prevents:

- Clients from supplying a different `id` in the body than the URL.
- Clients from overwriting server-managed fields.
- Blind writes to documents that don't exist or belong to another troop.

### 3. Security headers in Static Web App configuration

Add `globalHeaders` to `staticwebapp.config.json`:

- `X-Content-Type-Options: nosniff` — prevents MIME-type sniffing.
- `X-Frame-Options: DENY` — prevents clickjacking.
- `Referrer-Policy: strict-origin-when-cross-origin` — limits referrer leakage.
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` — restricts browser
  API access.

CSP was deferred because the `@github/spark` plugin injects inline scripts and the MSAL
redirect flow requires `connect-src` tuning. CSP should be added once the auth flow is
stable.

### 4. Health check endpoint

A new `GET /api/health` function verifies Cosmos DB connectivity by calling
`initDatabase()` and returns `{ status: "healthy" }` (200) or `{ status: "unhealthy" }`
(503). This supports deployment smoke tests and SWA backend health probes.

## Consequences

### Positive

- Eliminates mass assignment across all write paths.
- Enforces tenant isolation with explicit `troopId` stamping and read-before-write.
- Provides structured 400 errors with field-level details, improving client-side error
  handling.
- Zod schemas serve as living documentation of the API contract.
- Security headers raise the baseline against common browser-level attacks.
- Health endpoint enables zero-downtime deployment validation.

### Negative

- Adds ~25 KB (zod) to the Function App bundle. Negligible for Flex Consumption cold
  start.
- Read-before-write on PUT adds one extra Cosmos read (1 RU) per update. Acceptable at
  this scale.
- Schema maintenance — when `types.ts` evolves, `schemas.ts` must be updated in
  parallel. No automated sync exists yet.

### Risks

- **Schema drift**: If a frontend sends fields the schema doesn't expect, Zod silently
  strips them (default behavior). This is the desired behavior for security, but could
  mask legitimate new fields during development if schemas aren't updated.

## Outstanding Items (Not Addressed in This Change)

| Finding | Severity | Status | Notes |
|---------|----------|--------|-------|
| O1: Application Insights | Medium | Deferred | Requires Bicep changes + connection string wiring |
| R1: Continuous backup (PITR) | Medium | Deferred | Bicep property addition to Cosmos account |
| S3: Cross-partition auth query | Medium | Accepted | Acceptable at ~50 users; revisit if scale increases |

## References

- OWASP A04:2021 — Insecure Design (mass assignment)
- Azure WAF Security Pillar — Input validation at trust boundaries
- Azure Static Web Apps — Global headers configuration
