## Code Review

When reviewing pull requests, check for:

### Correctness
- TypeScript strict mode compliance — no `any` casts, no `@ts-ignore`
- Pydantic schemas in `api/app/schemas.py` validate all API inputs; no raw request body access
- TanStack Query hooks follow existing patterns in `src/hooks/`
- Frontend components use shadcn/ui primitives from `src/components/ui/`
- `date-fns` for date operations, not raw `Date` manipulation

### Testing
- API routers have corresponding tests in `api/tests/`
- Non-trivial frontend logic has unit tests
- Frontend tests use Vitest; API tests use pytest

### Conventions
- No changes to `infra/` unless the issue explicitly requires it
- No changes to `api/app/middleware/auth.py` unless the issue explicitly requires it
- No new dependencies without clear justification
- Branch targets `main` (trunk-based, no `develop` branch)

## Security Review

Flag any of the following as blocking issues:

### Authentication & Authorization
- API endpoints must call `validate_token()` or `get_troop_context()` before any data access
- Role checks via `check_permission()` must guard write operations
- No hard-coded secrets, tokens, or connection strings

### Input Validation
- All user input must pass through Pydantic schemas before use
- No string interpolation in Cosmos DB queries — use parameterized queries only
- URL and path inputs must be validated; no open redirects

### Data Exposure
- API responses must not leak internal IDs, stack traces, or other users' data
- Error responses must use generic messages, not raw error details
- No `.env` files, secrets, or credentials committed

### Dependencies
- Flag new dependencies for known vulnerabilities
- Flag dependencies that are unmaintained or have low adoption

### Concurrency & Data Integrity
- Read-modify-write operations on Cosmos DB must use ETag-based optimistic concurrency
- Parent entity deletes must cascade to child records
- Update endpoints must use `exclude_unset=True` to preserve server-managed fields

### Authorization Depth
- Role-based permission alone is insufficient for user-owned resources — require ownership checks
- New member records must include identity fields from token claims
- Endpoints returning user data must strip PII for non-admin roles
