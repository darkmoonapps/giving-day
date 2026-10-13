# Developer Role Guide

## Overview

Developers implement features, fix bugs, write tests, and maintain code quality according to project standards.

## Responsibilities

### Implementation

- Write clean, maintainable TypeScript code
- Implement features according to specifications
- Follow established patterns and conventions
- Write comprehensive tests (unit, component, integration)
- Handle errors gracefully
- Ensure code works in RTL and LTR

### Code Quality

- Write strict TypeScript with no `any` types
- Follow ESLint and Prettier rules
- Write self-documenting code with clear names
- Keep functions and components focused
- Refactor when code becomes complex
- Review own code before requesting review

### Testing

- Write tests for every feature and bug fix
- Achieve good test coverage
- Test edge cases and error conditions
- Use appropriate test types (unit, component, e2e)
- Ensure tests are reliable and fast

### Collaboration

- Communicate progress and blockers
- Ask questions when requirements are unclear
- Participate in code reviews
- Help teammates when needed
- Share knowledge and learnings

### Documentation

- Update documentation when changing behavior
- Write clear commit messages (Conventional Commits)
- Comment only when necessary (code should be self-explanatory)
- Keep README and setup docs accurate

## Key Inputs

- Feature specifications from PM
- Designs from Designer
- Architectural guidance from Architect
- Code reviews from Team Lead and peers
- Bug reports from QA

## Key Outputs

- Working, tested code
- Unit, component, and integration tests
- Pull requests with clear descriptions
- Code review feedback for peers
- Bug fixes
- Documentation updates

## Interaction with Other Roles

### With Product Manager

- Ask clarifying questions on requirements
- Provide effort estimates
- Suggest technical alternatives
- Demo completed features

### With Designer

- Implement designs accurately
- Ask about interaction details
- Suggest technical constraints or improvements
- Ensure responsive and accessible implementation

### With Architect

- Follow architectural guidelines
- Ask for guidance on complex designs
- Propose refactoring when needed
- Flag technical debt

### With QA

- Provide test builds
- Clarify expected behavior
- Reproduce and fix bugs
- Verify fixes

### With Team Lead

- Report progress and blockers
- Request code reviews
- Coordinate on technical tasks

## Definition of Done

A Developer's work is complete when:

- ✅ Feature works according to acceptance criteria
- ✅ Code follows all quality standards (see AGENTS.md)
- ✅ Tests written and passing (unit, component, integration as appropriate)
- ✅ All CI checks pass (lint, typecheck, format, tests)
- ✅ No TypeScript errors or `any` types
- ✅ No hardcoded strings (uses i18n)
- ✅ Works in both Hebrew (RTL) and English (LTR)
- ✅ Accessible (keyboard navigation, ARIA labels, semantic HTML)
- ✅ No console errors or warnings
- ✅ Code reviewed and approved
- ✅ Documentation updated
- ✅ Clean commit history with Conventional Commits format

## Quality Standards

### Code Quality

```typescript
// ❌ BAD
function doStuff(data: any) {
  return data.map((x: any) => {
    // @ts-ignore
    return x.name.toUpperCase();
  });
}

// ✅ GOOD
interface User {
  name: string;
}

function formatUserNames(users: User[]): string[] {
  return users.map((user) => user.name.toUpperCase());
}
```

### TypeScript Standards

- **Always** use strict mode
- **Never** use `any` - use `unknown` and type guards if needed
- **Never** use `@ts-ignore` or `@ts-expect-error` without strong justification
- Define interfaces for all data structures
- Use explicit return types for functions
- Use const assertions for literal types

### Testing Standards

```typescript
// ✅ GOOD: Clear test structure
describe('VolunteerConfirmationButton', () => {
  it('displays confirmation text', () => {
    render(<VolunteerConfirmationButton />);
    expect(screen.getByText('אשר השתתפות')).toBeInTheDocument();
  });

  it('calls onConfirm when clicked', async () => {
    const onConfirm = vi.fn();
    render(<VolunteerConfirmationButton onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('shows loading state during submission', async () => {
    render(<VolunteerConfirmationButton isLoading />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
```

### i18n Standards

```typescript
// ❌ BAD
<Button>Confirm</Button>

// ✅ GOOD
const { t } = useTranslation('volunteer');
<Button>{t('confirm_button')}</Button>
```

### Component Standards

```typescript
// ✅ GOOD: Well-structured component
interface VolunteerCardProps {
  volunteer: Volunteer;
  onConfirm: (id: string) => void;
}

export function VolunteerCard({ volunteer, onConfirm }: VolunteerCardProps) {
  const { t } = useTranslation('volunteer');

  const handleConfirm = () => {
    onConfirm(volunteer.id);
  };

  return (
    <Card>
      <Text>{volunteer.name}</Text>
      <Button onClick={handleConfirm}>
        {t('confirm_button')}
      </Button>
    </Card>
  );
}
```

## Common Tasks

### 1. Implementing a New Feature

1. **Understand the requirement**: Read spec, designs, acceptance criteria
2. **Plan the approach**: Identify components/services to change
3. **Create a branch**: `git checkout -b cursor/feature-name-3b90`
4. **Write tests first** (TDD) or alongside implementation
5. **Implement**: Write code following standards
6. **Test manually**: Verify in browser/API client
7. **Verify i18n**: Test in both Hebrew and English
8. **Run checks**: `pnpm lint && pnpm typecheck && pnpm test`
9. **Commit**: Using Conventional Commits format
10. **Push and create PR**: With clear description
11. **Address review feedback**: Make changes, push updates
12. **Merge**: Once approved (done by Team Lead or Owner)

### 2. Fixing a Bug

1. **Reproduce the bug**: Understand the issue
2. **Write a failing test**: That exposes the bug
3. **Fix the code**: Make the test pass
4. **Verify manually**: Ensure bug is resolved
5. **Check for regressions**: Run full test suite
6. **Commit and PR**: `fix(scope): brief description of bug`

### 3. Refactoring

1. **Ensure tests exist**: For code being refactored
2. **Refactor**: Improve structure without changing behavior
3. **Verify tests pass**: Behavior unchanged
4. **Commit**: `refactor(scope): description of refactoring`

### 4. Code Review (Reviewing Others)

Look for:

- Follows project standards (TypeScript, i18n, testing)
- Tests are comprehensive
- Code is readable and maintainable
- No obvious bugs or edge cases missed
- Accessible and works in RTL/LTR
- Follows architectural patterns
- Documentation updated if needed

Give feedback that is:

- Constructive and specific
- Explains reasoning
- Suggests alternatives
- Distinguishes between blocking issues and suggestions

## Development Workflow

### Local Development

```bash
# Start databases
docker-compose up -d

# Install dependencies
pnpm install

# Run database migrations
pnpm db:generate
pnpm --filter @giving-day/api prisma migrate dev

# Start dev servers
pnpm dev

# Frontend: http://localhost:3000
# Backend: http://localhost:4000
```

### Before Committing

```bash
# Run all checks
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check

# Fix formatting if needed
pnpm format
```

### Creating a PR

1. **Clear title**: Conventional Commits format
2. **Description**: Explain what and why
3. **Screenshots**: If UI changes
4. **Testing notes**: How to test the change
5. **References**: Link to issue/requirement

## Tools and Environment

### Required

- Node.js 22+
- pnpm 10+
- Docker (for PostgreSQL)
- Git

### Recommended

- VSCode with extensions:
  - ESLint
  - Prettier
  - TypeScript
  - i18next Ally (for translation keys)
  - Prisma (for schema highlighting)

### Browser DevTools

- React DevTools
- Network tab for API debugging
- Console for errors

## Red Flags to Watch For

🚩 **Warning signs** in your own code:

- Using `any` type
- Skipping tests "temporarily"
- Hardcoded strings instead of i18n
- Long functions (>50 lines)
- Deeply nested code (>3 levels)
- Copy-pasted code
- No error handling
- Console.log left in code
- Committing commented-out code
- Ignoring TypeScript errors
- Not testing in RTL mode

## Best Practices

1. **Write tests first or alongside code**: TDD or test-during-development
2. **Keep functions small**: One responsibility per function
3. **Use descriptive names**: Variables and functions should explain themselves
4. **Extract magic numbers**: Use named constants
5. **Handle errors explicitly**: Don't swallow errors silently
6. **Validate user input**: Never trust external data
7. **Keep components focused**: Single responsibility principle
8. **Prefer composition**: Over inheritance and prop drilling
9. **Make it work, then make it better**: Don't over-optimize prematurely
10. **Ask for help**: When stuck, ask early rather than spinning

## Common Pitfalls to Avoid

1. **N+1 Query Problem**: Use Prisma `include` properly

   ```typescript
   // ❌ BAD: N+1 queries
   const volunteers = await prisma.volunteer.findMany();
   for (const v of volunteers) {
     v.elder = await prisma.elder.findUnique({ where: { id: v.elderId } });
   }

   // ✅ GOOD: Single query
   const volunteers = await prisma.volunteer.findMany({
     include: { elder: true },
   });
   ```

2. **Missing Error Handling**:

   ```typescript
   // ❌ BAD: No error handling
   async function confirmVolunteer(id: string) {
     await fetch(`/api/confirmations/${id}/confirm`, { method: 'POST' });
   }

   // ✅ GOOD: Proper error handling
   async function confirmVolunteer(id: string): Promise<void> {
     const response = await fetch(`/api/confirmations/${id}/confirm`, {
       method: 'POST',
     });

     if (!response.ok) {
       throw new Error(`Failed to confirm: ${response.statusText}`);
     }
   }
   ```

3. **Not Testing Edge Cases**: Test happy path and error cases

4. **Forgetting RTL**: Always test Hebrew RTL layout

---

**Remember**: Quality is not negotiable. Write code you'd be proud to maintain yourself in 6 months. When in doubt, ask. It's better to ask than to guess and get it wrong.
