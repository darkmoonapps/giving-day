# ADR 0014: NestJS OpenAPI and Orval Clients

**Status**: Accepted

**Date**: 2026-10-13

## Context

The web app was calling `/api/health` with a handwritten `fetch`. As more
REST endpoints appear we need:

- Documented, browsable HTTP contracts
- Generated TypeScript clients and TanStack Query hooks
- A CI check so generated code cannot drift from the API

## Decision

1. **`@nestjs/swagger`** builds an OpenAPI document. Swagger UI is served at
   `/api/docs`.
2. **`pnpm --filter @giving-day/api openapi:generate`** writes
   `apps/api/openapi.json` without connecting to the database
   (`SKIP_DB_CONNECT=true`).
3. **Orval** reads that spec and generates TanStack Query hooks into
   `apps/web/src/api/generated`.
4. CI runs **`pnpm codegen:check`**. If the spec or generated client differs
   from git, the check fails.

## Consequences

### Positive

- Frontend hooks stay aligned with the NestJS contract
- Swagger is available during local API development
- Drift is caught in CI instead of at runtime

### Negative

- Generated files must be committed
- Codegen needs a working TypeScript build of `packages/shared`

### Mitigation

- Ignore generated TS in ESLint/Prettier
- Document `pnpm codegen` in the README
- Keep OpenAPI examples fake (ADR 0007)

## Alternatives Considered

### Handwritten fetch wrappers

**Rejected**: Types drift and every endpoint repeats error handling.

### GraphQL / tRPC

**Rejected**: Conflicts with ADR 0005 (REST). Extra protocol for a small app.

### Generate clients in CI without committing them

**Rejected**: Local typecheck and Storybook/dev would need the API running or
a generate step before every install.

## Notes

- Custom fetch mutator lives at `apps/web/src/api/mutator.ts`
- Operation IDs should stay stable (`getHealth`) so hook names do not churn
