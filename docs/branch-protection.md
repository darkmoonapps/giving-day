# Branch protection for `master`

Recommended GitHub rules for `master`. Apply them in **Settings → Rules →
Rulesets** (or classic branch protection). Agents and contributors cannot
enable these from a PR; an org owner must click them.

This repo squash-merges into `master`. The PR title becomes the commit on
`master`, so the PR title check is as important as commitlint.

## Rules

| Rule                                              | Recommended value             | Why                                               |
| ------------------------------------------------- | ----------------------------- | ------------------------------------------------- |
| Require a pull request before merging             | On                            | No direct pushes to `master`                      |
| Required approvals                                | 1                             | Owner reviews; authors do not merge their own PRs |
| Dismiss stale reviews when new commits are pushed | On                            | Review matches the tip                            |
| Require review from Code Owners                   | Off until `CODEOWNERS` exists | Avoid a lockout                                   |
| Require conversation resolution                   | On                            | Review threads are not left open                  |
| Require status checks to pass                     | On                            | CI, titles, and CodeQL must be green              |
| Require branches to be up to date                 | On                            | Merges are tested against latest `master`         |
| Require linear history                            | On                            | Matches squash-only history                       |
| Allow force pushes                                | Off                           | Protects release tags and `master`                |
| Allow deletions                                   | Off                           | `master` must remain                              |
| Restrict who can push / bypass                    | Repository admins only        | Bypass is for emergencies                         |
| Allowed merge methods                             | Squash only                   | Conventional PR title is the `master` commit      |
| Delete head branches after merge                  | On                            | Less stale remote branches                        |

## Required status checks

Use the **job name** (not the workflow file name) when adding checks.

| Check name       | Workflow       | Job id           |
| ---------------- | -------------- | ---------------- |
| `lint-and-build` | CI             | `lint-and-build` |
| `e2e-tests`      | CI             | `e2e-tests`      |
| `commitlint`     | Commit Lint    | `commitlint`     |
| `pr-title`       | PR Title Check | `pr-title`       |
| `Analyze`        | CodeQL         | `analyze`        |

`lint-and-build` is the gate for Turborepo pipelines (`pnpm lint`,
`pnpm typecheck`, `pnpm build`, `pnpm test:ci`) plus Prettier, codegen
freshness, and Prisma `db push`. `e2e-tests` rebuilds with Turbo and runs
Playwright.

Do **not** require `Release Please`. That workflow runs only on `master`
after merge and opens its own version/changelog PR.

## Dependabot and Release Please

- Dependabot PRs must still pass the same required checks.
- Dependabot commit prefixes are `chore(deps)` and `ci(deps)` so commitlint
  and the PR title check succeed (ADR 0016).
- Release Please uses `GITHUB_TOKEN`. GitHub does not run `pull_request`
  workflows on PRs opened by that token. After the first release PR appears,
  either approve/merge it with a human push if checks are missing, or store
  a fine-grained PAT as a secret and point
  `.github/workflows/release-please.yml` at it (ADR 0017).

## How to apply (UI)

1. Open the repository **Settings**.
2. Go to **Rules → Rulesets → New ruleset → Branch**.
3. Name it `master protection`.
4. Target branch: `master`.
5. Enable the rules in the table above.
6. Under **Require status checks to pass**, add the five check names.
7. Save. Confirm a new PR shows those checks as required.

Classic **Settings → Branches → Add branch protection rule** works if
Rulesets are unavailable. Use the same required check names.
