# ADR 0012: Zustand for UI State, TanStack Query for Server State

**Status**: Accepted

**Date**: 2026-10-13

## Context

The frontend needs two different kinds of state:

- Ephemeral UI preferences (open/closed panels, local toggles)
- Server state (API health today; later volunteers, days, confirmations)

Mixing both in React `useState`/`useEffect` does not scale and makes caching
and refetching ad hoc.

## Decision

- **Zustand** stores client-only UI state, with `persist` for preferences that
  should survive reloads.
- **TanStack Query** owns server state. Generated Orval hooks are the default
  way to read and mutate the API.

The current Zustand store keeps the health-card details toggle and the
color-scheme preference (`auto` | `light` | `dark`). The current TanStack
Query usage is the health endpoint with a 30s refetch interval.

## Consequences

### Positive

- Clear split: UI store vs server cache
- Generated hooks stay typed against OpenAPI
- Preferences persist without rolling a custom storage helper

### Negative

- Another library to learn
- Risk of putting server data in Zustand by habit

### Mitigation

- Document the split in this ADR and in role guides
- Review PRs that fetch in `useEffect` or store API payloads in Zustand

## Alternatives Considered

### Redux Toolkit

**Rejected**: More boilerplate than we need for a small PWA.

### React Context only

**Rejected**: Fine for a few values, poor for server cache, refetch, and
deduplication.

### SWR

**Rejected**: TanStack Query pairs better with Orval's generated hooks.

## Notes

- Language preference stays in i18next/`localStorage` (`i18nextLng`), not Zustand
- QueryClient is provided once at the app root
