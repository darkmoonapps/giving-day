# ADR 0009: Testing Strategy

**Status**: Accepted

**Date**: 2026-10-13

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

**Tools**:

- **Vitest** - Unit and component test runner (aligned with Vite)
- **React Testing Library** - Component testing
- **Playwright** - End-to-end browser testing, including the language-switch smoke test
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
- name: Run tests
  run: pnpm test:ci

- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## Decisions Locked In

### Test Framework Choice

**Vitest** is the unit/component runner. It is Vite-native, fast, and works
across `apps/web`, `apps/api`, `packages/ui`, and `packages/shared`.

### Coverage Enforcement

Coverage is not a CI gate yet. Focus on behavior tests for new foundations
and keep adding coverage with each feature.

### E2E Test Frequency

Playwright runs on every PR. The first smoke test covers Hebrew RTL to
English LTR language switching.

### Mocking Strategy

- Frontend: mock `fetch` / Query Client for component tests
- API: mock Prisma in controller unit tests
- E2E: run against the built web preview (API is optional for the language switch)

### Snapshot Testing

Use sparingly. Prefer accessible queries and user-visible assertions.

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
