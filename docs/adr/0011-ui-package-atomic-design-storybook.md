# ADR 0011: Atomic Design UI Package with Storybook

**Status**: Accepted

**Date**: 2026-10-13

## Context

The web app needs a reusable, bilingual-friendly component library that:

- Sits on top of Mantine instead of restyling from scratch
- Keeps presentational components separate from app/feature code
- Gives designers and developers a place to review states in isolation
- Has a Conventional Commits scope of its own (`ui`)

## Decision

Create **`packages/ui` (`@giving-day/ui`)** as an atomic-design library:

- **Atoms** - thin Mantine wrappers (`AppButton`, `AppText`, `AppTitle`, `AppBadge`, `AppLoader`, `AppAlert`)
- **Molecules** - composed controls (`LanguageSwitcher`, `ColorSchemeToggle`, `LabeledStatus`, `LoadingState`)
- **Organisms** - page-level layout (`AppHeader`, `AppPageShell`, `HealthStatusCard`)
- **Theme** - Mantine `createTheme` with a light pastel **Wisteria & mint** palette and a dark **deep plum** scheme

Document every exported component in **Storybook**. The package is
i18n-agnostic: it receives already-translated strings as props so Hebrew and
English stay in `apps/web`.

## Consequences

### Positive

- Clear composition rules and reuse across screens
- Storybook is the visual catalog for RTL-first components and both color schemes
- `ui` commit/PR scope can be restored and enforced
- Web app stays focused on wiring data, i18n, and routes

### Negative

- Extra package to build and type-check
- Prop lists can get long when every string is passed in

### Mitigation

- Keep wrappers thin
- Build `packages/ui` before web typecheck/build
- Write RTL/component tests next to stories

## Alternatives Considered

### Colocate all components in `apps/web`

**Rejected**: The design system would be hard to browse and easy to couple to
feature code.

### Headless components without Mantine

**Rejected**: Conflicts with ADR 0003. Mantine already provides accessible,
RTL-aware primitives.

## Notes

- Storybook runs from `packages/ui` (`pnpm --filter @giving-day/ui storybook`)
- Shared types such as `LanguageCode` come from `@giving-day/shared`
- Light theme: wisteria `#A99BE0` primary scale, mint `#A8E6CF` for success/Delivered
- Dark theme: deep plum `#1E1A2E` body with brightened wisteria/mint accents
- Color scheme defaults to the OS preference (`auto`) and is persisted in Zustand
- Theme tokens are checked against WCAG AA (4.5:1 text, 3:1 UI)
