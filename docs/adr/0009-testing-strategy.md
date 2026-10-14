# ADR 0009: Testing Strategy

**Status**: Accepted

**Date**: 2026-10-13

**Updated**: 2026-10-13 (implemented)

## Context

The application needs a comprehensive testing strategy covering:

- Unit tests for business logic
- Component tests for UI
- Integration tests for API endpoints
- End-to-end tests for critical user flows

We need to decide on testing frameworks, coverage targets, and CI integration while balancing thoroughness with development velocity.

## Decision

Implement a **multi-layer testing strategy**:

- **Unit tests** for business logic (services, utilities)
- **Component tests** for React components
- **API integration tests** for backend endpoints
- **End-to-end tests** for critical flows

**Chosen Tools**:

- **Vitest** - Fast, Vite-native unit and integration test runner
- **React Testing Library** - Component testing
- **Playwright** - End-to-end browser testing, including the language-switch smoke test
- **Supertest** - HTTP assertions for NestJS integration tests
- **NestJS unit tests** - Controller tests with mocked Prisma (Vitest)

## Consequences

### Positive

- **Confidence** - Catch bugs before production
- **Refactoring safety** - Tests enable fearless refactoring
- **Documentation** - Tests serve as usage examples
- **Regression prevention** - Automated checks prevent reintroducing bugs
- **CI integration** - Automated testing on every PR

### Negative

- **Development time** - Writing tests takes time
- **Maintenance burden** - Tests need updates when features change
- **Flaky tests** - E2E tests especially can be unstable
- **Learning curve** - Team must learn testing tools and patterns

### Mitigation Strategies

- Focus on high-value tests (critical flows, complex logic)
- Use test-driven development (TDD) where appropriate
- Keep tests simple and maintainable
- Mock external dependencies to reduce flakiness
- Retry flaky E2E tests before failing

## Testing Layers

### 1. Unit Tests

**Scope**: Pure functions, utilities, business logic

**Examples**:

- Proximity calculation logic
- Date/time utilities
- Validation functions
- State management (if using Zustand/Redux)

**Tools**: Vitest

**Pattern**:

```typescript
describe('calculateProximity', () => {
  it('returns distance between two coordinates', () => {
    const distance = calculateProximity(
      { lat: 32.0853, lon: 34.7818 }, // Tel Aviv
      { lat: 31.7683, lon: 35.2137 } // Jerusalem
    );
    expect(distance).toBeCloseTo(53, 0); // ~53km
  });
});
```

### 2. Component Tests

**Scope**: React components in isolation

**Examples**:

- Volunteer list renders correctly
- Confirmation button click triggers callback
- Form validation displays errors
- Loading states show spinners

**Tools**: React Testing Library + Vitest

**Pattern**:

```typescript
import { render, screen } from '@testing-library/react';
import { ConfirmButton } from './ConfirmButton';

test('displays confirmation text', () => {
  render(<ConfirmButton />);
  expect(screen.getByText('אשר השתתפות')).toBeInTheDocument();
});

test('calls onConfirm when clicked', async () => {
  const onConfirm = vi.fn();
  render(<ConfirmButton onConfirm={onConfirm} />);
  await userEvent.click(screen.getByRole('button'));
  expect(onConfirm).toHaveBeenCalledOnce();
});
```

### 3. API Integration Tests

**Scope**: API endpoints, database interactions

**Examples**:

- POST /api/volunteers creates volunteer
- GET /api/distribution-days returns list
- Authentication guards reject unauthorized requests
- Validation returns 400 for invalid input

**Tools**: Supertest + NestJS testing module

**Pattern**:

```typescript
describe('VolunteersController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  it('/api/volunteers (POST) creates volunteer', () => {
    return request(app.getHttpServer())
      .post('/api/volunteers')
      .send({ name: 'Test Volunteer', phone: '+972-50-0000000' })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined();
      });
  });
});
```

### 4. End-to-End Tests

**Scope**: Critical user flows in real browser

**Examples**:

- Admin creates distribution day
- Volunteer receives notification and confirms
- Admin reassigns cancelled volunteer's elder
- Language switcher changes UI language

**Tools**: Playwright

**Pattern**:

```typescript
test('volunteer confirms participation', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.click('text=התחבר'); // Login
  // ... login flow ...
  await page.click('text=אשר השתתפות');
  await expect(page.locator('.confirmation-success')).toBeVisible();
});
```

## Coverage Targets

**Target Coverage** (to be agreed with owner):

- **Unit tests**: Aim for 80%+ coverage of business logic
- **Component tests**: Test all user-facing components
- **API tests**: All endpoints have basic happy-path test
- **E2E tests**: Critical flows covered (login, confirm, create day, reassign)

**Not aiming for 100%** - diminishing returns. Focus on high-value tests.

## CI Integration

All tests must pass before merging PRs:

```yaml
- name: Run unit and integration tests
  run: pnpm test:ci

- name: Run E2E tests
  run: pnpm test:e2e
```

The CI workflow includes:

- Unit and integration tests for both web and API (Postgres service + `prisma migrate deploy`)
- E2E tests with Playwright against a production build (`api start` + `web preview`)
- Playwright waits for `GET http://localhost:3001/api/health` before running UI tests
- Playwright browsers installed with `pnpm exec playwright install` and cached by lockfile hash
- Playwright HTML report and `test-results/` uploaded **only when the e2e-tests job fails** (`if: failure()`)

## Implementation

### Web App (apps/web)

- **Configuration**: `vitest.config.ts` with jsdom environment
- **Setup**: Test setup file loads `@testing-library/jest-dom`
- **Tests**:
  - `App.test.tsx` - Component tests using role and test-id queries
  - Includes fake-timer test for polling behavior
  - Tests both healthy and unhealthy states
- **Test Patterns**: Uses `vi.stubGlobal` and `vi.unstubAllGlobals` for fetch mocking
- **Commands**:
  - `pnpm test` - Run tests in watch mode
  - `pnpm test:ci` - Run tests once with coverage

### API (apps/api)

- **Configuration**: `vitest.config.ts` with node environment and unplugin-swc
- **Setup**: Test setup loads `reflect-metadata` for NestJS, unplugin-swc for decorator metadata
- **Tests**:
  - `src/health/health.controller.spec.ts` - Unit tests for health controller
  - `test/health.int.spec.ts` - Integration tests with Supertest
    - Tests connected database case with real Prisma
    - Tests disconnected case with overridden Prisma provider
    - Boots full NestJS app with global `/api` prefix
- **Commands**:
  - `pnpm test` - Run tests in watch mode
  - `pnpm test:ci` - Run tests once with coverage

### E2E (root)

- **Configuration**: `playwright.config.ts` with chromium browser
  - Uses build + preview/start in CI (not dev mode)
  - Retries failed tests 2x in CI
  - Caches Playwright browsers by lockfile hash
- **Tests**: `e2e/smoke.spec.ts` - Uses role and test-id queries (no hardcoded text)
  - Verifies homepage loads
  - Asserts healthy API status badge
  - Asserts connected database badge
- **CI Setup**:
  - Runs `prisma migrate deploy` against CI Postgres
  - Builds apps, then Playwright starts `api start` and `web preview`
  - Waits for `GET :3001/api/health` before running UI tests
  - Uploads `playwright-report/` and `test-results/` only on e2e job failure
- **Commands**:
  - `pnpm test:e2e` - Run E2E tests
  - `pnpm test:e2e:ui` - Run E2E tests with UI

### Root Scripts

- `pnpm test` - Turborepo `test` (once, with `--run`) plus repo-foundation checks
- `pnpm test:ci` - Turborepo `test:ci` (coverage) plus repo-foundation checks
- `pnpm test:e2e` - Run E2E tests

## Resolved Decisions

### Test Framework Choice

- **Decision**: Vitest chosen for its speed, Vite-native integration, and modern API
- **Status**: Implemented in both web and api packages

### E2E Test Frequency

- **Decision**: Run E2E on every PR (using PostgreSQL service)
- **Status**: Implemented in CI workflow

### Mocking Strategy

- **Decision**:
  - Use `vi.stubGlobal` and `vi.unstubAllGlobals` for global mocks (like fetch)
  - Integration tests use real Prisma with CI Postgres
  - Override providers in NestJS testing module for disconnected case
- **Status**: Implemented in web and API tests

### Query Strategy

- **Decision**: Use role and test-id queries (not hardcoded English text)
- **Rationale**: Supports i18n (Hebrew/English) without breaking tests
- **Status**: Implemented in web and E2E tests with data-testid attributes

## Open Questions

### Coverage Enforcement

- Should CI fail if coverage drops below threshold?
- What threshold? 70%? 80%?
- **Current**: Coverage collected but not enforced

### Snapshot Testing

- Use snapshot tests for components?
- Can be brittle but useful for catching unintended changes
- **Recommendation**: Use sparingly for complex UI states

E2E also covers Hebrew RTL to English LTR language switching and the
saved color-scheme toggle.

## Alternatives Considered

### No Testing

**Rejected**: Unacceptable for production application. Manual testing doesn't scale and regressions are inevitable.

### Manual Testing Only

**Rejected**: Too slow, not repeatable, human error-prone. Automated tests are essential.

### TDD (Test-Driven Development) Required

**Deferred**: TDD is valuable but enforcing it strictly can slow down prototyping. Encourage TDD for complex logic, don't mandate it everywhere.

### Cypress Instead of Playwright

**Rejected**: Playwright is faster, more reliable, supports multiple browsers better, and has better TypeScript support.

## Notes

- Write tests alongside features, not as an afterthought
- Flaky tests should be fixed or removed immediately
- Use data-testid attributes sparingly (prefer accessible queries like role, label)
- Test user behavior, not implementation details
- Keep tests simple and readable
- Consider visual regression testing (Chromatic, Percy) in future
