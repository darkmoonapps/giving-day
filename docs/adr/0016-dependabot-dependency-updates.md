# ADR 0016: Dependabot for npm and GitHub Actions

**Status**: Accepted

**Date**: 2026-10-13

## Context

Dependencies and GitHub Actions must stay current for security patches and
compatibility. We need automated update PRs for:

- The pnpm workspace (`package.json` / `pnpm-lock.yaml`)
- Workflows under `.github/workflows`

Two common options are GitHub-native Dependabot and Mend Renovate.

## Decision

Use **Dependabot** (`/.github/dependabot.yml`).

**Why Dependabot instead of Renovate**:

- Built into GitHub — no extra GitHub App, marketplace install, or hosted
  bot account
- First-class `npm` and `github-actions` ecosystems, including pnpm
  lockfiles
- Enough for a small private product: weekly cadence, grouped PRs,
  Conventional Commit prefixes (`chore(deps)`, `ci(deps)`)
- Renovate is more powerful (automerge, richer monorepo grouping, config
  presets) but that extra surface is not worth a third-party app yet

Schedule: weekly on Monday. Production and development npm updates are
grouped separately. All Actions updates are one grouped PR.

## Consequences

### Positive

- Security and routine bumps arrive as reviewable PRs
- Commit/PR titles already match commitlint and the PR title check
- No additional credentials to rotate

### Negative

- Weaker grouping and automerge than Renovate
- npm groups can still produce large lockfile diffs
- Dependabot cannot run our Turbo remote cache (we do not use one)

### Mitigation

- Cap open PRs (`open-pull-requests-limit`)
- Review lockfile and CI on every Dependabot PR
- Revisit Renovate if grouping or automerge becomes a bottleneck

## Alternatives Considered

### Renovate

**Rejected for now**: Requires installing the Renovate GitHub App (or a
self-hosted runner) and maintaining `renovate.json`. Better later if we
need automerge, vulnerability dashboards, or cross-repo presets.

### Manual upgrades only

**Rejected**: Easy to miss Actions and transitive security fixes.

## Notes

- Labels: `dependencies`
- Do not commit `.env` files or real personal data in update reproductions
  (ADR 0007)
