# Changelog

## [0.2.0](https://github.com/darkmoonapps/giving-day/compare/v0.1.0...v0.2.0) (2026-10-31)


### Features

* add free-tier deploy and sentry setup ([1fd2db0](https://github.com/darkmoonapps/giving-day/commit/1fd2db0f18903bbd06f4c18ab9f6c2a06ee7c74c))
* add project skeleton with pnpm workspaces monorepo ([6530fd2](https://github.com/darkmoonapps/giving-day/commit/6530fd25c1400123e54d02c5cd312739bcf71835))
* Add project skeleton with pnpm workspaces monorepo ([bfae28d](https://github.com/darkmoonapps/giving-day/commit/bfae28d191dc3b53058ae56121250e378e266663))
* **api:** add city-scoped coordinator permanent matches ([#34](https://github.com/darkmoonapps/giving-day/issues/34)) ([4cdd5cc](https://github.com/darkmoonapps/giving-day/commit/4cdd5ccb2198f0d59ff961e8303c7fd8a9c13764))
* **api:** add join-link redemption and membership approval ([#38](https://github.com/darkmoonapps/giving-day/issues/38)) ([576a51e](https://github.com/darkmoonapps/giving-day/commit/576a51e5d75ec37267cd68fc71d6149370cf851b))
* **api:** add prisma schema from approved data model ([54005e6](https://github.com/darkmoonapps/giving-day/commit/54005e62a3d036b850c6921918ce9ac06a9ec724))
* **api:** add prisma schema from approved data model ([6dc45cf](https://github.com/darkmoonapps/giving-day/commit/6dc45cff068863230b28fad9e5725bbdd715671e))
* **api:** auth and city-scoped CASL ([#23](https://github.com/darkmoonapps/giving-day/issues/23)) ([dd934cd](https://github.com/darkmoonapps/giving-day/commit/dd934cde361e39e0c0ddffef68fe7230334190cb))
* **api:** city settings API ([#24](https://github.com/darkmoonapps/giving-day/issues/24)) ([9b95483](https://github.com/darkmoonapps/giving-day/commit/9b95483edb48b9d37b5fa710c3a55e0800cf7810))
* **api:** distribution day open and notification plumbing ([#25](https://github.com/darkmoonapps/giving-day/issues/25)) ([b8ada5c](https://github.com/darkmoonapps/giving-day/commit/b8ada5c7cd0122f0c59ebe7bba6464c7b57a7922))
* **api:** prefill unmatched active elders as needing a volunteer ([#35](https://github.com/darkmoonapps/giving-day/issues/35)) ([0300cdd](https://github.com/darkmoonapps/giving-day/commit/0300cdd421530e3770d9e83a5a45d4f17bc7087f))
* elders CRUD API ([#33](https://github.com/darkmoonapps/giving-day/issues/33)) ([c9dd105](https://github.com/darkmoonapps/giving-day/commit/c9dd10529b347d01e451bf3105e23a8995c0e1d1))
* free-tier deploy and Sentry setup ([af47083](https://github.com/darkmoonapps/giving-day/commit/af47083b2c1703746e9fa1a14c43f348af51d2a0))
* **ui:** add frontend foundations ([3bfa3be](https://github.com/darkmoonapps/giving-day/commit/3bfa3be9c8e768e2b2853af32bf8a1f54cc668c9))
* **ui:** add frontend foundations ([925f683](https://github.com/darkmoonapps/giving-day/commit/925f683932925909ad8307fa48a2130ddc0b73d3))
* **web:** add city join-link landing and redemption ([#39](https://github.com/darkmoonapps/giving-day/issues/39)) ([1b1f7c4](https://github.com/darkmoonapps/giving-day/commit/1b1f7c48ce5441320bb9250b9c3aadf5d3d04e3b))
* **web:** add coordinator elders management page ([#37](https://github.com/darkmoonapps/giving-day/issues/37)) ([5b7e3d5](https://github.com/darkmoonapps/giving-day/commit/5b7e3d5063630104b9b6ef474063fc44a4c193d8))
* **web:** add coordinator pending join-request review ([#40](https://github.com/darkmoonapps/giving-day/issues/40)) ([c7ec7d2](https://github.com/darkmoonapps/giving-day/commit/c7ec7d2f6839d1bdd73ac6c2790a615ed2ada5e4))
* **web:** add sort and filter on coordinator day deliveries ([#36](https://github.com/darkmoonapps/giving-day/issues/36)) ([86f374f](https://github.com/darkmoonapps/giving-day/commit/86f374fd18df94c9ba408a5c6e0cb5e9c3d04b29))
* **web:** day deliveries from permanent volunteer-elder matches ([7d7e80c](https://github.com/darkmoonapps/giving-day/commit/7d7e80c6438ba1f897e2a6854369fb40ad5122e4))
* **web:** login, onboarding, and empty home ([#26](https://github.com/darkmoonapps/giving-day/issues/26)) ([20c0a45](https://github.com/darkmoonapps/giving-day/commit/20c0a45837155c25201fdba5beadc22130ad98bc))
* **web:** volunteer confirm and decline participation ([#29](https://github.com/darkmoonapps/giving-day/issues/29)) ([8e815d2](https://github.com/darkmoonapps/giving-day/commit/8e815d2feec83cb2774d637f687176e721e87c9c))


### Bug Fixes

* address team-lead review of frontend foundations ([86d2c3b](https://github.com/darkmoonapps/giving-day/commit/86d2c3bf00bfe0337a2d0ec97b9216c56da549c8))
* **api:** add partial unique indexes and schema constraint tests ([fc22c0c](https://github.com/darkmoonapps/giving-day/commit/fc22c0c0a65d25e7bee55419fc7a279126396c9b))
* **api:** cross-site OAuth session after Google callback ([#27](https://github.com/darkmoonapps/giving-day/issues/27)) ([233ab49](https://github.com/darkmoonapps/giving-day/commit/233ab498cd21febce64f4db41e8cfc39d4bbc9ac))
* **api:** match postgres time type cast in schema defaults ([69bed78](https://github.com/darkmoonapps/giving-day/commit/69bed78a0cdbdb9b68f6906ca38e93a89ac699b8))
* **api:** parse onboarding birthDate for Prisma DateTime ([#28](https://github.com/darkmoonapps/giving-day/issues/28)) ([2037aa7](https://github.com/darkmoonapps/giving-day/commit/2037aa71479d1cdae553bc5a5d88cab85c81390a))
* **api:** return 400 for invalid participation responses ([2a508f1](https://github.com/darkmoonapps/giving-day/commit/2a508f17355b701050302f0c191014bafe45e375))
* assign pool confirmed-only and decline auto-unassigns deliveries ([325e791](https://github.com/darkmoonapps/giving-day/commit/325e791891d93689477809d501e5757098a341f9))
* **ci:** add step to generate Prisma client before build ([fcbfc22](https://github.com/darkmoonapps/giving-day/commit/fcbfc224a418305a60f8648a77876bbfb95b2faa))
* **ci:** correct prisma migrate diff arguments ([a9523b3](https://github.com/darkmoonapps/giving-day/commit/a9523b345e19f6ed705bfd8cb4a88cda589188e8))
* **ci:** drop conflicting pnpm version pin ([1851b10](https://github.com/darkmoonapps/giving-day/commit/1851b1071eb9e3963743d887bc47fba17f1e87bd))
* **ci:** keep orval output out of lint-staged ([89f3623](https://github.com/darkmoonapps/giving-day/commit/89f3623368b765b652746d95379c00b7360a78c8))
* **ci:** release one tag and skip generated codeql paths ([ba4f089](https://github.com/darkmoonapps/giving-day/commit/ba4f089b845f79047a241a4fe65589bb543d2e93))
* **ci:** update pnpm version to 10 for lockfile compatibility ([de884d9](https://github.com/darkmoonapps/giving-day/commit/de884d9eca4de08b326f63eebc6305c28de066f4))
* **ci:** use schema-datasource for drift check ([df2ceb2](https://github.com/darkmoonapps/giving-day/commit/df2ceb26791742f532d94ec7239184aa20152c3b))
* **shared:** emit commonjs so the nest api can start ([173465f](https://github.com/darkmoonapps/giving-day/commit/173465f707d46776a4aada7fa85e47990f858485))
* **ui:** address frontend foundations review ([b400889](https://github.com/darkmoonapps/giving-day/commit/b40088969b6e3bdc077d0e3e7e32096c8a11c9a5))
* **web:** load shared source in vite and persist language ([5ad0285](https://github.com/darkmoonapps/giving-day/commit/5ad0285e0115dd6b53f22adda39eb64b88cc5218))


### Documentation

* add PRD, ADRs, AGENTS.md and role guides ([de9cded](https://github.com/darkmoonapps/giving-day/commit/de9cdeda8734d49170ce029196391bc8c4b432da))
* add PRD, ADRs, AGENTS.md and role guides ([63289bf](https://github.com/darkmoonapps/giving-day/commit/63289bfef69fbde34eca8acc265c5cc77aed1a7a))
* apply owner onboarding, join-link and elder notes changes ([fb39662](https://github.com/darkmoonapps/giving-day/commit/fb3966229d036c77c3309401328ba1bc05721aa2))
* apply shai notes to prd volunteer flow ([a5f5975](https://github.com/darkmoonapps/giving-day/commit/a5f59755d41cbc1d5666b32bf8ddfcf9ed492894))
* data model, rbac and multi-city roles ([a5a5d81](https://github.com/darkmoonapps/giving-day/commit/a5a5d8113195f0bd53d3d7d7a68629bfd7d4206b))
* data model, rbac and multi-city roles ([c1ce6b3](https://github.com/darkmoonapps/giving-day/commit/c1ce6b3cf2c25c0687e7a4ccad76191222374c1d))
* update prd with volunteer flow and notifications ([e2ccc86](https://github.com/darkmoonapps/giving-day/commit/e2ccc861daa4fbe376d9ba51a8056c4d06ba98ba))
* update PRD with volunteer flow and notifications ([5e8b33a](https://github.com/darkmoonapps/giving-day/commit/5e8b33a5d981b3edde9cb4a28b87625332e04777))


### Continuous Integration

* add prisma migrate diff check to detect schema drift ([ae94f60](https://github.com/darkmoonapps/giving-day/commit/ae94f60329f6529b8bb0299d9ea8aa1e45d2aaf7))
* allow deps-dev scope for dependabot ([edd0176](https://github.com/darkmoonapps/giving-day/commit/edd01762ef3c19f0a80942ce1405a95f6a9b3eb8))
* allow deps-dev scope for dependabot ([ae4eeee](https://github.com/darkmoonapps/giving-day/commit/ae4eeeede98da26aeb0fc87ddf6936205e47d3fd))
* apply prettier formatting to pr title workflow ([262542b](https://github.com/darkmoonapps/giving-day/commit/262542b81b4df2ea459232984ecbfa1ac9d88913))
* **deps:** bump cloudflare/wrangler-action ([70ee605](https://github.com/darkmoonapps/giving-day/commit/70ee605edbad097429ea43b935a10ed1608e7180))
* **deps:** bump cloudflare/wrangler-action from 3 to 4 in the github-actions group ([b2c8782](https://github.com/darkmoonapps/giving-day/commit/b2c8782d083d336bc84188d21f4a7e67df7de486))
* **deps:** bump googleapis/release-please-action ([77e850a](https://github.com/darkmoonapps/giving-day/commit/77e850ad83c94039a418d1a0a4005774c048c27f))
* **deps:** bump googleapis/release-please-action from 4 to 5 in the github-actions group ([b0ef3c4](https://github.com/darkmoonapps/giving-day/commit/b0ef3c458ac5818725b625b342818cc8b200170d))
* enforce conventional commits with commitlint and husky ([b5b371e](https://github.com/darkmoonapps/giving-day/commit/b5b371e98722ae52222e129915bb86298969dba2))
* enforce conventional commits with commitlint and husky ([6334e21](https://github.com/darkmoonapps/giving-day/commit/6334e21996a1440617943c6e0c8a28ea3e77d7d3))
* make pr title scope optional and remove ui scope ([47cd919](https://github.com/darkmoonapps/giving-day/commit/47cd919d27dedccada29b8bbaffc86129c22de96))
* raise commitlint header-max-length to 100 ([4fec886](https://github.com/darkmoonapps/giving-day/commit/4fec8867df0c5d12e2933c4b332689e6d9c15e78))
* raise commitlint header-max-length to 100 ([044479e](https://github.com/darkmoonapps/giving-day/commit/044479e565ef2b2d308d2871286ed88c494a95b5))


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
* **ci:** limit dependabot to minor and patch updates ([46be60c](https://github.com/darkmoonapps/giving-day/commit/46be60c2f690441a31cce395fb1c9b05d17f1fbe))
* **ci:** limit dependabot to minor and patch updates ([b9224a5](https://github.com/darkmoonapps/giving-day/commit/b9224a58963c1817190e947111a137a59b506728))
* **deps-dev:** bump the npm-development group across 1 directory with 12 updates ([433efd1](https://github.com/darkmoonapps/giving-day/commit/433efd1b4f215707f03c07626cedbecba68f1357))
* **deps-dev:** bump the npm-development group across 1 directory with 12 updates ([f2acdf7](https://github.com/darkmoonapps/giving-day/commit/f2acdf72e8bfb24b4aee7e8aa418ab3f9420af63))
* **deps:** bump the npm-production group with 13 updates ([05b331f](https://github.com/darkmoonapps/giving-day/commit/05b331f84aa38a326023fee25fbc1143999ab0ca))
* **deps:** bump the npm-production group with 13 updates ([11c3d02](https://github.com/darkmoonapps/giving-day/commit/11c3d02e9b821b76e6910a395b41a0b471e272ad))
* **deps:** upgrade Mantine to v9.7.2 ([245630b](https://github.com/darkmoonapps/giving-day/commit/245630bcc371b6bccba1f2c5fa7e0d6575609b7c))
* merge master into frontend foundations ([9a4aec8](https://github.com/darkmoonapps/giving-day/commit/9a4aec87f3a9db3789a20c3a150040b6bda9ce07))

## Changelog

All notable changes to this project are documented in this file.

The format is produced by [Release Please](https://github.com/googleapis/release-please)
from Conventional Commits (ADR 0017).
