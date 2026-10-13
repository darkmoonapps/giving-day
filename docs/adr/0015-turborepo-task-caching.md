# ADR 0015: Turborepo for Workspace Task Pipelines

**Status**: Accepted

**Date**: 2026-10-13

## Context

ADR 0002 chose pnpm workspaces and deferred Turborepo/Nx/Lerna. The repo now
has four packages (`web`, `api`, `shared`, `ui`) with a real dependency graph:
apps typecheck and test against built library output. Root scripts were
calling `pnpm -r` and a manual `shared`/`ui` build before `typecheck`.

We need:

- Task pipelines (`lint`, `typecheck`, `test`, `build`) that respect
  workspace dependencies
- Local and CI caching so unchanged packages are not rebuilt
- One command surface for agents and humans (`pnpm lint`, `pnpm build`)

## Decision

Adopt **Turborepo** (`turbo` 2.x) as the task runner on top of pnpm
workspaces.

- Root scripts invoke `turbo run <task>`
- `turbo.json` defines `build`, `lint`, `typecheck`, `test`, and `test:ci`
- `build`, `typecheck`, `lint`, and tests `dependsOn: ["^build"]` so
  `@giving-day/shared` and `@giving-day/ui` build first
- CI caches `.turbo` and runs the same root scripts
- Remote cache is not enabled yet

## Consequences

### Positive

- Packages skip work when inputs are unchanged
- Dependency order is declared once instead of hardcoded `pnpm --filter`
- CI and local commands stay identical

### Negative

- Another tool to learn
- Cache invalidation bugs can hide a real failure until `--force`

### Mitigation

- Keep `turbo.json` small and documented
- CI still runs format, codegen, Prisma, and Playwright outside Turbo
- `DATABASE_URL` is part of the `test:ci` cache key

## Alternatives Considered

### Keep `pnpm -r` only

**Rejected**: Does not cache task outputs or encode `^build` edges. The
manual typecheck prelude already proved we need a graph.

### Nx

**Rejected**: Heavier plugin model and more generated config than we need.
Turborepo is a thin cache/orchestrator on an existing pnpm workspace.

### Lerna

**Rejected**: Versioning/publish focus. Release Please covers releases
(ADR 0017). Lerna does not replace task caching.

## Notes

- `packageManager` in the root `package.json` is required by Turbo 2.
  GitHub Actions `pnpm/action-setup` must not also set `version`, or the
  two pins conflict.
- `dev` is `cache: false` and `persistent: true`
- See [docs/branch-protection.md](../branch-protection.md) for required CI
  checks that run these pipelines
