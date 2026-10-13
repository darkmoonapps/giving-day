# ADR 0013: Zod Schemas in `packages/shared`

**Status**: Accepted

**Date**: 2026-10-13

## Context

Web and API already share TypeScript types. Runtime validation was still
missing, so a malformed health payload (or later, form input) could pass the
type checker and fail in the UI.

## Decision

Keep **Zod schemas in `packages/shared`** and infer TypeScript types from
them. The first schemas are:

- `healthResponseSchema` / `HealthResponse`
- `languageCodeSchema` / `LanguageCode` plus `getDirection()`
- `colorSchemePreferenceSchema` / `ColorSchemePreference`

`packages/shared` compiles to CommonJS so Nest can `require` the built
package from `node dist/main`. The package `import` condition points at
TypeScript source so Vite can use named ESM exports during `pnpm dev`.

The API parses outgoing health payloads with the same schema. The web app
parses TanStack Query results before rendering.

## Consequences

### Positive

- One contract for compile-time and runtime
- No `any` at the package boundary
- Easy to extend for future DTOs without inventing a second type source

### Negative

- Zod is an extra runtime dependency on both sides
- Schema changes require a shared-package rebuild

## Alternatives Considered

### TypeScript types only

**Rejected**: No runtime guarantee when JSON arrives from the network.

### class-validator only on the API

**Rejected**: The web app would still need its own validators. Zod works in
both Node and the browser.

### Generate Zod from OpenAPI

**Deferred**: Orval can emit Zod later. Hand-written shared schemas stay the
source of truth for the small current surface.

## Notes

- Never commit real personal data in example schema values (see ADR 0007)
- Prefer `z.infer<typeof schema>` over parallel handwritten interfaces
