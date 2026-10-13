# ADR 0002: pnpm Monorepo

**Status**: Accepted

**Date**: 2026-10-13

## Context

The Giving Day project consists of multiple related packages:

- Frontend web application (React + Vite)
- Backend API (NestJS)
- Shared TypeScript types and utilities
- Potentially more packages (mobile wrappers, admin tools, scripts)

We need a structure that allows code sharing, consistent dependency management, and efficient workflows.

## Decision

We will use **pnpm workspaces** to manage the project as a monorepo.

**Structure**:

```
/
├── apps/
│   ├── web/       # React PWA
│   └── api/       # NestJS backend
├── packages/
│   └── shared/    # Shared types and utilities
├── pnpm-workspace.yaml
└── package.json   # Root package
```

## Consequences

### Positive

- **Efficient disk usage** - pnpm uses content-addressable storage, dramatically reducing `node_modules` size
- **Fast installations** - Significantly faster than npm/yarn for repeated installs
- **Workspace protocol** - Easy cross-package references with `workspace:*`
- **Strict by default** - pnpm's strict node_modules prevents phantom dependencies
- **Built-in monorepo support** - No additional tools like Lerna needed for basic operations
- **Parallel scripts** - Run commands across all packages with `pnpm -r`
- **Atomic lockfile operations** - Better for CI and multi-developer teams

### Negative

- **Team learning curve** - Developers may be more familiar with npm/yarn
- **Some tooling incompatibility** - Rare edge cases where tools don't work with pnpm (mitigated by `.npmrc` configs)
- **CI cache setup** - Slightly different caching strategy needed compared to npm

### Mitigation Strategies

- Document pnpm-specific commands in README
- Use `engines` field to enforce pnpm usage
- Configure `.npmrc` for compatibility where needed
- Set up CI caching correctly for pnpm

## Alternatives Considered

### npm workspaces

**Rejected**: Much slower than pnpm, less efficient disk usage, weaker isolation. pnpm provides better performance and strictness without additional complexity.

### Yarn (v1 or v3)

**Rejected**:

- Yarn v1: deprecated, slower than pnpm
- Yarn v3 (Berry): PnP mode has compatibility issues, less mature tooling support

### Monorepo Tools (Turborepo, Nx, Lerna)

**Deferred**: These tools add caching, orchestration, and task pipelines on top of package managers. Our project is small enough that pnpm's built-in features suffice. Can add Turborepo/Nx later if build times become a bottleneck.

### Separate Repositories (Polyrepo)

**Rejected**: Would complicate shared type definitions, require publishing internal packages, slow down cross-package changes, and add coordination overhead for small team.

## Notes

- pnpm version 10+ required (specified in `engines`)
- Use `pnpm-workspace.yaml` to define workspace packages
- Shared dependencies can be installed at root level
- Package-specific dependencies go in individual `package.json` files
- Use `pnpm --filter` to run commands on specific packages
