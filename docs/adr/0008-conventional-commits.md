# ADR 0008: Conventional Commits Enforced in CI

**Status**: Accepted

**Date**: 2026-10-13

## Context

As the codebase grows and multiple contributors work on the project, we need:

- Clear, consistent commit message format
- Ability to generate changelogs automatically
- Easy to understand what each commit does at a glance
- Potential for semantic versioning based on commit types

## Decision

Adopt **Conventional Commits** specification and enforce it in CI.

**Format**: `<type>(<scope>): <description>`

**Types**:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring (no feature change or bug fix)
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `build`: Build system changes (dependencies, tooling)
- `ci`: CI/CD changes (GitHub Actions, scripts)
- `chore`: Other changes (tooling, maintenance)
- `revert`: Revert a previous commit

**Scopes** (project-specific):

- `web`: Frontend React app
- `api`: Backend NestJS API
- `shared`: Shared packages
- `ci`: CI/CD workflows
- `docs`: Documentation
- `deps`: Dependencies

**Examples**:

```
feat(web): add volunteer confirmation screen
fix(api): handle missing elder assignment correctly
docs: update README with setup instructions
test(web): add tests for volunteer list component
build(deps): upgrade Mantine to 7.16.0
ci: add commitlint check to GitHub Actions
refactor(api): extract notification service
```

## Consequences

### Positive

- **Consistency** - All commit messages follow same format
- **Clarity** - Type and scope make purpose obvious
- **Automation** - Can generate changelogs from commits
- **Navigation** - Easy to filter commits by type or scope
- **Semantic versioning** - Can automate version bumps based on types
- **Collaboration** - Team speaks same language

### Negative

- **Learning curve** - Team must learn the format
- **Enforcement overhead** - Requires tooling and CI checks
- **Commit discipline** - Developers must write good descriptions
- **Rebase friction** - Harder to quickly amend commits

### Mitigation Strategies

- Document format clearly in AGENTS.md
- Set up commitlint to validate locally and in CI
- Provide examples and templates
- Use IDE plugins (VSCode Conventional Commits extension)
- Fail PRs in CI if commits don't follow format

## Implementation

### Tools

1. **commitlint** - Validates commit messages
2. **husky** (optional) - Git hooks for local validation
3. **GitHub Actions** - CI check to enforce on all PRs

### Configuration

**commitlint.config.js**:

```javascript
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', ['web', 'api', 'shared', 'ci', 'docs', 'deps']],
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
  },
};
```

### CI Enforcement

```yaml
- name: Validate commits
  run: npx commitlint --from HEAD~1 --to HEAD --verbose
```

### Commit Message Guidelines

- **Imperative mood**: "add feature" not "added feature"
- **Lowercase**: type and scope in lowercase
- **No period**: Don't end description with period
- **Keep description short**: < 72 characters if possible
- **Body optional**: Add blank line then detailed explanation if needed
- **Breaking changes**: Use `BREAKING CHANGE:` footer or `!` after type/scope

**Example with body**:

```
feat(api)!: change confirmation endpoint response format

BREAKING CHANGE: The /api/confirmations/:id endpoint now returns
{ status: 'confirmed' } instead of { confirmed: true }
```

## Scope Usage Guidelines

- Use `web` for frontend-only changes
- Use `api` for backend-only changes
- Use `shared` for changes to shared packages
- Use `ci` for GitHub Actions, workflow changes
- Use `docs` for documentation (PRD, ADRs, README)
- Use `deps` for dependency updates (even if scoped to web/api, use deps if that's the main change)
- Omit scope if change affects multiple areas equally

## Alternatives Considered

### Free-form Commit Messages

**Rejected**: Leads to inconsistency, hard to parse, can't automate changelog generation, difficult to understand project history.

### GitHub Flow (PR titles only)

**Rejected**: While we do care about PR titles, individual commits also matter for bisecting, reverting, and understanding detailed history.

### Semantic Release

**Deferred**: Fully automated versioning based on commits. Can adopt later if we want automatic releases. Conventional Commits is a prerequisite for it.

### Other Commit Conventions (Gitmoji, Angular)

**Rejected**: Gitmoji uses emojis which are fun but less parseable. Angular's format is essentially Conventional Commits (which was derived from it).

## Notes

- Commits to `master` or `main` should always follow this format
- Feature branches can have messy commits during development
- Squash-merge PRs to ensure single clean commit in main branch history
- PR titles should follow Conventional Commits format (CI enforces this)
- Use `revert` type when reverting commits rather than manually undoing
