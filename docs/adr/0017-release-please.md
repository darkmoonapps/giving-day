# ADR 0017: Release Please for Versions and Changelog

**Status**: Accepted

**Date**: 2026-10-13

## Context

ADR 0008 adopted Conventional Commits and deferred automated semantic
releases. We now want:

- Version bumps derived from commit types (`feat` → minor, `fix` → patch)
- A generated `CHANGELOG.md`
- GitHub Releases without a hand-edited process

The repo is a private pnpm monorepo. Packages share one product version
today (`0.1.0`).

## Decision

Use **Release Please** (`googleapis/release-please-action`) on pushes to
`master`.

- Manifest config: `release-please-config.json` and
  `.release-please-manifest.json`
- `node-workspace` keeps workspace dependency versions aligned
- `linked-versions` keeps root, web, api, shared, and ui on the same
  version and one release PR
- Tags use a leading `v` (`v0.2.0`) and do not include the component name
- `bump-minor-pre-major: true` so `feat` commits bump minor while we are
  still `0.x`

The default `GITHUB_TOKEN` opens the release PR and publishes the GitHub
Release. If branch protection later blocks that token from updating
`master`, switch to a fine-grained PAT stored as a repository secret.

## Consequences

### Positive

- Changelog and versions follow the commit history we already enforce
- One reviewable release PR instead of hand-editing four package files
- Fits squash-merge + Conventional PR titles (the squash message is what
  Release Please sees)

### Negative

- First release PR may be large (all conventional commits since `0.1.0`)
- Workflows on the Release Please PR may not run when the actor is
  `GITHUB_TOKEN` (GitHub restriction)
- Mis-typed commits (`chore` that should have been `fix`) skip the bump

### Mitigation

- PR title and commitlint stay required (see branch protection)
- Document the token limitation in
  [docs/branch-protection.md](../branch-protection.md)
- Prefer squash merges so `master` history stays conventional

## Alternatives Considered

### semantic-release

**Rejected**: Runs in CI and publishes immediately. Release Please opens a
PR the owner can review, which matches “do not merge your own PRs” and
gives a changelog preview.

### Changesets

**Rejected**: Extra per-PR changeset files. Conventional Commits already
encode the bump.

### Manual CHANGELOG and version edits

**Rejected**: Drifts quickly and duplicates information already in commits.

## Notes

- ADR 0008’s deferred “Semantic Release” item is superseded by this ADR
- Packages stay `private: true`; Release Please does not publish to npm
