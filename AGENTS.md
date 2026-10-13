# AGENTS.md - Guide for AI Agents Working on Giving Day

## Project Overview

**Giving Day** is a volunteer management application for coordinating monthly food-package distribution days. It helps a Latet volunteer coordinator manage ~140 elderly recipients and ~100 volunteers through automated confirmations, reminders, and reassignments.

**Tech Stack**:

- **Frontend**: React 19 + Vite + Mantine (PWA)
- **Backend**: NestJS + Prisma + PostgreSQL
- **Language**: TypeScript throughout
- **Internationalization**: Hebrew (RTL) + English (LTR) via react-i18next
- **Infrastructure**: pnpm monorepo, Docker for local development

## Repository Structure

```
giving-day/
├── apps/
│   ├── web/              # React PWA frontend
│   │   ├── src/
│   │   ├── public/
│   │   └── package.json
│   └── api/              # NestJS backend
│       ├── src/
│       ├── prisma/
│       └── package.json
├── packages/
│   ├── shared/           # Shared TypeScript types, Zod schemas, and utilities
│   └── ui/               # Atomic design component library (Mantine + Storybook)
├── docs/
│   ├── PRD.md           # Product Requirements Document
│   ├── adr/             # Architecture Decision Records
│   └── roles/           # Role-specific guides
├── .github/
│   └── workflows/       # CI/CD workflows
├── pnpm-workspace.yaml
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10+
- Docker and Docker Compose (for PostgreSQL)

### Installation

```bash
# Install dependencies
pnpm install

# Start PostgreSQL
docker-compose up -d

# Run database migrations
pnpm db:generate
pnpm --filter @giving-day/api prisma migrate dev

# Start development servers (both frontend and backend)
pnpm dev

# Frontend will be at http://localhost:3000
# Backend will be at http://localhost:4000
```

### Common Commands

```bash
# Development
pnpm dev                    # Start all apps in dev mode
pnpm --filter @giving-day/web dev     # Start only frontend
pnpm --filter @giving-day/api dev     # Start only backend

# Building
pnpm build                  # Build all apps
pnpm --filter @giving-day/web build   # Build only frontend

# Linting and Formatting
pnpm lint                   # Lint all packages
pnpm format                 # Format all files with Prettier
pnpm format:check           # Check formatting without modifying

# Type Checking
pnpm typecheck              # Type-check all packages

# Database
pnpm db:generate            # Generate Prisma client
pnpm --filter @giving-day/api prisma migrate dev    # Create migration
pnpm --filter @giving-day/api prisma studio         # Open Prisma Studio GUI

# Testing
pnpm test                   # Unit and component tests (Vitest)
pnpm test:e2e               # Playwright smoke tests
pnpm test:ci                # Unit tests plus Playwright

# Code generation
pnpm codegen                # OpenAPI spec + Orval clients
pnpm codegen:check          # Fail if generated clients are stale
```

## Quality Standards - MUST FOLLOW

Every AI agent working on this project must adhere to these **strict quality standards**:

### 1. TypeScript Strictness

✅ **Required**:

- Strict TypeScript mode enabled (`strict: true`)
- **Never use `any` type** - use `unknown` and narrow with type guards if needed
- **Never use `@ts-ignore` or `@ts-expect-error`** unless absolutely necessary with explanation
- All functions must have explicit return types
- All parameters must have explicit types
- Use proper type narrowing with type guards

❌ **Forbidden**:

```typescript
function processVolunteer(data: any) {
  // NO!
  // @ts-ignore
  return data.name.toUpperCase();
}
```

✅ **Correct**:

```typescript
interface Volunteer {
  name: string;
  phone: string;
}

function processVolunteer(data: Volunteer): string {
  return data.name.toUpperCase();
}
```

### 2. Testing Requirements

- **Every feature must have tests** - unit, component, or integration as appropriate
- **No PR without tests** - Changes without tests will be rejected
- Write tests that verify behavior, not implementation details
- Use meaningful test descriptions
- Follow testing best practices from ADR 0009

### 3. Linting, Formatting, and Type Checking

- **All checks must pass before opening PR**:
  - `pnpm lint` - No ESLint errors
  - `pnpm format:check` - Code properly formatted
  - `pnpm typecheck` - No TypeScript errors
- Fix issues locally, don't rely on CI to catch them
- Use Prettier for consistent formatting
- Configure your editor to show ESLint/TypeScript errors inline

### 4. Internationalization (i18n)

- **Never hardcode UI strings** - Always use `t('key')` from react-i18next
- Support both Hebrew (RTL) and English (LTR)
- Test layouts in both directions
- Place translations in appropriate namespaces:
  - `common.json` - Shared UI elements
  - `volunteer.json` - Volunteer features
  - `admin.json` - Admin dashboard
  - `auth.json` - Authentication
  - `validation.json` - Form validation

❌ **Forbidden**:

```typescript
<Button>Confirm < /Button>  / / NO!;
```

✅ **Correct**:

```typescript
const { t } = useTranslation('volunteer');
<Button>{t('confirm_button')}</Button>
```

### 5. Code Quality and Style

- **Small, focused PRs** - One feature or fix per PR
- **Single responsibility** - Functions/components do one thing well
- **Clean module boundaries** - No circular dependencies
- **Meaningful names** - Variables, functions, components named clearly
- **Comments only when necessary** - Code should be self-documenting
- **Extract complex logic** - Don't nest more than 3 levels deep
- **Error handling** - Always handle errors gracefully

### 6. Security and Validation

- **Validate all user input** - Use class-validator in NestJS
- **Sanitize data** - Prevent XSS, SQL injection
- **Authenticate requests** - Protect API endpoints with guards
- **Authorize actions** - Check user permissions
- **Secure environment variables** - Never commit secrets
- **Use HTTPS in production** - No plain HTTP for sensitive data

### 7. Accessibility

- **Semantic HTML** - Use proper elements (`<button>`, `<nav>`, `<main>`)
- **ARIA labels** - Add labels for screen readers where needed
- **Keyboard navigation** - All interactive elements keyboard-accessible
- **Focus management** - Visible focus indicators
- **Color contrast** - Meet WCAG AA standards
- **Responsive design** - Works on mobile and desktop

### 8. No Personal Data in Repository

- **Never commit real personal data** - See ADR 0007
- **Use fake data for tests** - Use Faker.js or manual placeholders
- **Never commit `.env` files** - Only commit `.env.example`
- **No production database dumps** - Use seed scripts with fake data

### 9. Commit and PR Guidelines

- **Use Conventional Commits** - See ADR 0008
- Format: `<type>(<scope>): <description>`
- Examples:
  - `feat(web): add volunteer confirmation screen`
  - `fix(api): handle missing elder assignment`
  - `docs: update setup instructions in README`
  - `test(web): add volunteer list component tests`

**Scopes**:

- `web` - Frontend changes
- `api` - Backend changes
- `shared` - Shared package changes
- `ui` - Shared UI component library
- `ci` - CI/CD changes
- `docs` - Documentation
- `deps` - Dependency updates

**PR Requirements**:

- Clear title using Conventional Commits format
- Description explaining what and why
- Tests included and passing
- All CI checks green (lint, typecheck, format, tests)
- No merge conflicts
- Follows all quality standards above

**Git Hooks**:

This project uses **Husky** for automated local enforcement:

- **commit-msg** hook: Validates commit messages with commitlint
- **pre-commit** hook: Runs lint-staged (Prettier + ESLint on staged files)

The hooks are automatically installed when you run `pnpm install` via the `prepare` script. If hooks aren't working, run:

```bash
pnpm prepare
```

**CI Enforcement**:

Three GitHub Actions workflows enforce standards on all PRs:

1. **CI** (`.github/workflows/ci.yml`): Runs lint, typecheck, generated-client check, tests, format checks, and build
2. **Commit Lint** (`.github/workflows/commitlint.yml`): Validates all commits in a PR against Conventional Commits
3. **PR Title Check** (`.github/workflows/pr-title.yml`): Validates PR title against Conventional Commits (important for squash merges)

### 10. Database and Schema Changes

- **Use Prisma migrations** - Never manually modify database
- **Commit migration files** - Include in PR
- **Test migrations locally** - Verify before pushing
- **Document complex migrations** - Explain in PR description
- **Safe migration patterns** - Avoid data loss (see ADR 0010)

### 11. Performance Considerations

- **Lazy load routes** - Use React lazy() for code splitting
- **Optimize images** - Compress and use appropriate formats
- **Debounce expensive operations** - Search, API calls
- **Memoize calculations** - Use useMemo/useCallback appropriately
- **Index database queries** - Add indexes for common lookups
- **Avoid N+1 queries** - Use Prisma `include` properly

## What NOT to Do

❌ **Never do these things**:

1. **Push directly to `master`** - Always create a feature branch and PR
2. **Merge your own PRs** - Owner approves and merges
3. **Skip tests** - Every change needs tests
4. **Use `any` type** - Use proper types or `unknown`
5. **Hardcode strings** - Use i18n
6. **Commit secrets or personal data** - Use environment variables and fake data
7. **Ignore CI failures** - Fix issues before merging
8. **Create huge PRs** - Break work into smaller, reviewable chunks
9. **Modify files outside your scope** - Stay focused on the task
10. **Introduce breaking changes without discussion** - Coordinate with team

## PR Review Checklist

Before opening a PR, verify:

- [ ] Follows Conventional Commits format
- [ ] All tests pass (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Type checking passes (`pnpm typecheck`)
- [ ] Formatting is correct (`pnpm format:check`)
- [ ] No hardcoded strings (uses i18n)
- [ ] No `any` types or `@ts-ignore`
- [ ] Works in both Hebrew (RTL) and English (LTR)
- [ ] No personal data or secrets committed
- [ ] Documentation updated if needed
- [ ] ADRs updated if architectural decisions made
- [ ] PR description explains what and why

## Understanding the Project

Before making changes:

1. **Read `docs/PRD.md`** - Understand product requirements and goals
2. **Read relevant ADRs in `docs/adr/`** - Understand architectural decisions
3. **Check existing code** - Follow established patterns
4. **Read role guides in `docs/roles/`** - Understand your role's responsibilities

## Getting Help

- Check documentation in `docs/`
- Review ADRs for architectural context
- Look at existing code for patterns
- Ask the project owner for clarification

## Definition of Done

A task is complete when:

1. ✅ Feature works as specified in requirements
2. ✅ Tests written and passing
3. ✅ Code reviewed and approved by owner
4. ✅ All CI checks passing
5. ✅ Documentation updated
6. ✅ No regressions introduced
7. ✅ Works in both Hebrew and English
8. ✅ Accessibility requirements met
9. ✅ Security considerations addressed
10. ✅ Merged to `master` by owner

---

**Remember**: Quality over speed. It's better to do it right than to do it fast. The owner will review and merge when satisfied that all standards are met.
