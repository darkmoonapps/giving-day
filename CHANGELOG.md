# Changelog

## [0.2.0](https://github.com/darkmoonapps/giving-day/compare/v0.1.0...v0.2.0) (2026-10-14)


### Features

* add free-tier deploy and sentry setup ([1fd2db0](https://github.com/darkmoonapps/giving-day/commit/1fd2db0f18903bbd06f4c18ab9f6c2a06ee7c74c))
* add project skeleton with pnpm workspaces monorepo ([6530fd2](https://github.com/darkmoonapps/giving-day/commit/6530fd25c1400123e54d02c5cd312739bcf71835))
* Add project skeleton with pnpm workspaces monorepo ([bfae28d](https://github.com/darkmoonapps/giving-day/commit/bfae28d191dc3b53058ae56121250e378e266663))
* free-tier deploy and Sentry setup ([af47083](https://github.com/darkmoonapps/giving-day/commit/af47083b2c1703746e9fa1a14c43f348af51d2a0))
* **ui:** add frontend foundations ([3bfa3be](https://github.com/darkmoonapps/giving-day/commit/3bfa3be9c8e768e2b2853af32bf8a1f54cc668c9))
* **ui:** add frontend foundations ([925f683](https://github.com/darkmoonapps/giving-day/commit/925f683932925909ad8307fa48a2130ddc0b73d3))


### Bug Fixes

* address team-lead review of frontend foundations ([86d2c3b](https://github.com/darkmoonapps/giving-day/commit/86d2c3bf00bfe0337a2d0ec97b9216c56da549c8))
* **ci:** add step to generate Prisma client before build ([fcbfc22](https://github.com/darkmoonapps/giving-day/commit/fcbfc224a418305a60f8648a77876bbfb95b2faa))
* **ci:** drop conflicting pnpm version pin ([1851b10](https://github.com/darkmoonapps/giving-day/commit/1851b1071eb9e3963743d887bc47fba17f1e87bd))
* **ci:** keep orval output out of lint-staged ([89f3623](https://github.com/darkmoonapps/giving-day/commit/89f3623368b765b652746d95379c00b7360a78c8))
* **ci:** release one tag and skip generated codeql paths ([ba4f089](https://github.com/darkmoonapps/giving-day/commit/ba4f089b845f79047a241a4fe65589bb543d2e93))
* **ci:** update pnpm version to 10 for lockfile compatibility ([de884d9](https://github.com/darkmoonapps/giving-day/commit/de884d9eca4de08b326f63eebc6305c28de066f4))
* **shared:** emit commonjs so the nest api can start ([173465f](https://github.com/darkmoonapps/giving-day/commit/173465f707d46776a4aada7fa85e47990f858485))
* **ui:** address frontend foundations review ([b400889](https://github.com/darkmoonapps/giving-day/commit/b40088969b6e3bdc077d0e3e7e32096c8a11c9a5))
* **web:** load shared source in vite and persist language ([5ad0285](https://github.com/darkmoonapps/giving-day/commit/5ad0285e0115dd6b53f22adda39eb64b88cc5218))


### Documentation

* add PRD, ADRs, AGENTS.md and role guides ([de9cded](https://github.com/darkmoonapps/giving-day/commit/de9cdeda8734d49170ce029196391bc8c4b432da))
* add PRD, ADRs, AGENTS.md and role guides ([63289bf](https://github.com/darkmoonapps/giving-day/commit/63289bfef69fbde34eca8acc265c5cc77aed1a7a))
* apply shai notes to prd volunteer flow ([a5f5975](https://github.com/darkmoonapps/giving-day/commit/a5f59755d41cbc1d5666b32bf8ddfcf9ed492894))
* update prd with volunteer flow and notifications ([e2ccc86](https://github.com/darkmoonapps/giving-day/commit/e2ccc861daa4fbe376d9ba51a8056c4d06ba98ba))
* update PRD with volunteer flow and notifications ([5e8b33a](https://github.com/darkmoonapps/giving-day/commit/5e8b33a5d981b3edde9cb4a28b87625332e04777))


### Continuous Integration

* apply prettier formatting to pr title workflow ([262542b](https://github.com/darkmoonapps/giving-day/commit/262542b81b4df2ea459232984ecbfa1ac9d88913))
* **deps:** bump googleapis/release-please-action ([77e850a](https://github.com/darkmoonapps/giving-day/commit/77e850ad83c94039a418d1a0a4005774c048c27f))
* **deps:** bump googleapis/release-please-action from 4 to 5 in the github-actions group ([b0ef3c4](https://github.com/darkmoonapps/giving-day/commit/b0ef3c458ac5818725b625b342818cc8b200170d))
* enforce conventional commits with commitlint and husky ([b5b371e](https://github.com/darkmoonapps/giving-day/commit/b5b371e98722ae52222e129915bb86298969dba2))
* enforce conventional commits with commitlint and husky ([6334e21](https://github.com/darkmoonapps/giving-day/commit/6334e21996a1440617943c6e0c8a28ea3e77d7d3))
* make pr title scope optional and remove ui scope ([47cd919](https://github.com/darkmoonapps/giving-day/commit/47cd919d27dedccada29b8bbaffc86129c22de96))


### Build System

* **deps:** upgrade Mantine to 7.17.8 ([14f11c5](https://github.com/darkmoonapps/giving-day/commit/14f11c54600d40c86e4f4c666a89c09fb2e1c166))


### Code Refactoring

* address PR review feedback ([3083e28](https://github.com/darkmoonapps/giving-day/commit/3083e288023eeb8ab0dc395abff18ab0c5e169b9))
* **web:** move icon generator script out of public directory ([d771497](https://github.com/darkmoonapps/giving-day/commit/d771497d0304872981a72814d924a6ade7b3785d))


### Tests

* add vitest, supertest, and playwright setup ([8c22336](https://github.com/darkmoonapps/giving-day/commit/8c22336cf86e637403b377d5f0e3fcab1b95e193))
* add vitest, supertest, and playwright setup ([897e928](https://github.com/darkmoonapps/giving-day/commit/897e92804cab3c4d6fde109c9e7755db865c830e))
* address review findings for testing setup ([7a07a51](https://github.com/darkmoonapps/giving-day/commit/7a07a51f012cf80afcbbba36137bfdc1f257f75f))
* **ci:** avoid unanchored url regexes in deploy docs checks ([a55a9e9](https://github.com/darkmoonapps/giving-day/commit/a55a9e9b731277b262ce16e9f77e6eb5c47acdac))
* **ci:** parse markdown hrefs for free-tier docs links ([c2040e9](https://github.com/darkmoonapps/giving-day/commit/c2040e95c94a4de42b55c564b0f67021beeec741))


### Miscellaneous

* add repo extras ([5044279](https://github.com/darkmoonapps/giving-day/commit/5044279b4afc09615a91a6a914ea3eb164ada212))
* add repo extras ([52e7174](https://github.com/darkmoonapps/giving-day/commit/52e7174b86d1bf839eac7ab277e34360ad2c8740))
* **deps:** upgrade Mantine to v9.7.2 ([245630b](https://github.com/darkmoonapps/giving-day/commit/245630bcc371b6bccba1f2c5fa7e0d6575609b7c))
* merge master into frontend foundations ([9a4aec8](https://github.com/darkmoonapps/giving-day/commit/9a4aec87f3a9db3789a20c3a150040b6bda9ce07))

## Changelog

All notable changes to this project are documented in this file.

The format is produced by [Release Please](https://github.com/googleapis/release-please)
from Conventional Commits (ADR 0017).
