# ADR 0003: React + Vite + Mantine

**Status**: Accepted

**Date**: 2026-10-13

## Context

The frontend needs a technology stack for building the PWA that:

- Enables rapid UI development
- Provides excellent mobile experience
- Supports RTL (Hebrew) and LTR (English) layouts
- Offers accessible, production-ready components
- Has good TypeScript support
- Builds fast during development

## Decision

**Frontend Stack**:

- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **Mantine v7** - Component library

## Consequences

### React 19

**Positive**:

- Industry-standard, large ecosystem
- Excellent TypeScript support
- Strong community and tooling
- Proven PWA support with service workers
- Team familiarity

**Negative**:

- Larger bundle size compared to lighter alternatives (Preact, Solid)
- Client-side rendering requires optimization for SEO (not a concern for this app)

### Vite

**Positive**:

- **Extremely fast** dev server with HMR
- **Efficient production builds** via Rollup
- **First-class PWA support** with vite-plugin-pwa
- Native ESM, no bundling in dev mode
- Excellent TypeScript support out-of-the-box
- Simple configuration

**Negative**:

- Younger ecosystem compared to Webpack (less mature, but stable enough)
- Some legacy plugins may not work

### Mantine v7

**Positive**:

- **Comprehensive component library** - Forms, tables, modals, notifications, etc.
- **Built-in RTL support** - Critical for Hebrew interface
- **Excellent accessibility** - ARIA attributes, keyboard navigation
- **TypeScript-first** - Full type safety
- **Hooks library** (`@mantine/hooks`) - Useful utilities
- **Theming system** - Easy customization
- **Active maintenance** - Regular updates and bug fixes
- **Good mobile support** - Responsive components

**Negative**:

- Opinionated styling system (CSS-in-JS with emotion)
- Learning curve for Mantine-specific patterns
- Bundle size larger than headless alternatives (but acceptable for our use case)

## Alternatives Considered

### UI Libraries

#### Material-UI (MUI)

**Rejected**: While mature and comprehensive, it's heavier than Mantine, has more complex theming, and RTL support is more manual. Mantine provides better DX for our use case.

#### Chakra UI

**Rejected**: Excellent library but less comprehensive component set, and RTL support while present is not as polished as Mantine's.

#### Headless UI Libraries (Radix, Headless UI, React Aria)

**Deferred**: These require more custom styling and are better for design systems. Our small team benefits from pre-styled components. Can consider for future redesigns.

#### Ant Design

**Rejected**: Comprehensive but design language is very opinionated and may not fit our needs. Less intuitive theming than Mantine.

### Build Tools

#### Webpack

**Rejected**: Slower dev server, more complex configuration, Vite provides better DX without sacrificing production quality.

#### Create React App (CRA)

**Rejected**: Deprecated and no longer maintained. Vite is the modern replacement.

#### Next.js

**Rejected**: Server-side rendering and routing complexity not needed for our PWA. Adds unnecessary overhead. Vite is simpler and faster for client-side apps.

### UI Frameworks

#### Vue

**Rejected**: Team is more familiar with React. React ecosystem is larger for our needs.

#### Svelte

**Rejected**: While Svelte is excellent, smaller ecosystem, less mature component libraries, and team learning curve outweigh bundle size benefits.

## Notes

- Pin Mantine to v7.x to avoid breaking changes from major version bumps
- Use Mantine's `MantineProvider` with RTL support via `direction` prop
- Configure Vite's `vite-plugin-pwa` for service worker and manifest generation
- Use Mantine's theme system for brand colors and spacing
- Leverage `@mantine/hooks` for common patterns (useMediaQuery, useLocalStorage, etc.)
