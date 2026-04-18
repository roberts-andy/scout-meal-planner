## Code Review

When reviewing pull requests, check for:

### Correctness
- TypeScript strict mode compliance — no `any` casts, no `@ts-ignore`
- Zod schemas in `api/src/schemas.ts` validate all API inputs; no raw `req.body` access
- TanStack Query hooks follow existing patterns in `src/hooks/`
- Frontend components use shadcn/ui primitives from `src/components/ui/`
- `date-fns` for date operations, not raw `Date` manipulation

### Testing
- API functions have corresponding `*.test.ts` files in `api/src/functions/`
- Non-trivial frontend logic has unit tests
- Tests use Vitest, not Jest

### Conventions
- No changes to `infra/` unless the issue explicitly requires it
- No changes to `api/src/middleware/auth.ts` unless the issue explicitly requires it
- No new dependencies without clear justification
- Branch targets `main` (trunk-based, no `develop` branch)

## Security Review

Flag any of the following as blocking issues:

### Authentication & Authorization
- API endpoints must call `validateToken()` or `getTroopContext()` before any data access
- Role checks via `checkPermission()` must guard write operations
- No hard-coded secrets, tokens, or connection strings

### Input Validation
- All user input must pass through Zod schemas before use
- No string interpolation in Cosmos DB queries — use parameterized queries only
- URL and path inputs must be validated; no open redirects

### Data Exposure
- API responses must not leak internal IDs, stack traces, or other users' data
- Error responses must use generic messages, not raw error details
- No `.env` files, secrets, or credentials committed

### Dependencies
- Flag new dependencies for known vulnerabilities
- Flag dependencies that are unmaintained or have low adoption
