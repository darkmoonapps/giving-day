import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {string} relativePath
 * @returns {string}
 */
function readRepoFile(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

describe('repo foundation extras', () => {
  it('defines turbo pipelines for lint, typecheck, test, and build', () => {
    const turbo = JSON.parse(readRepoFile('turbo.json'));
    const requiredTasks = ['lint', 'typecheck', 'test', 'test:ci', 'build'];

    for (const task of requiredTasks) {
      assert.ok(turbo.tasks[task], `missing turbo task: ${task}`);
    }

    assert.deepEqual(turbo.tasks.build.dependsOn, ['^build']);
    assert.deepEqual(turbo.tasks.typecheck.dependsOn, ['^build']);
    assert.ok(turbo.tasks['test:ci'].outputs.includes('coverage/**'));
  });

  it('configures Dependabot for npm and GitHub Actions', () => {
    const dependabot = readRepoFile('.github/dependabot.yml');

    assert.match(dependabot, /package-ecosystem:\s*npm/);
    assert.match(dependabot, /package-ecosystem:\s*github-actions/);
    assert.match(dependabot, /prefix:\s*chore/);
    assert.match(dependabot, /prefix:\s*ci/);
  });

  it('tracks workspace versions in Release Please', () => {
    const config = JSON.parse(readRepoFile('release-please-config.json'));
    const manifest = JSON.parse(readRepoFile('.release-please-manifest.json'));
    const extraVersionFiles = [
      'apps/web/package.json',
      'apps/api/package.json',
      'packages/shared/package.json',
      'packages/ui/package.json',
    ];

    assert.deepEqual(Object.keys(config.packages), ['.']);
    assert.deepEqual(manifest, { '.': '0.1.0' });
    assert.equal(config['include-component-in-tag'], false);

    const extraFiles = config.packages['.']['extra-files'];
    const extraPaths = extraFiles.map(
      (/** @type {{ path: string }} */ file) => file.path
    );
    for (const file of extraVersionFiles) {
      assert.ok(extraPaths.includes(file), `missing extra-file ${file}`);
    }
    assert.ok(
      extraFiles.every(
        (/** @type {{ type: string, jsonpath: string }} */ file) =>
          file.type === 'json' && file.jsonpath === '$.version'
      )
    );
    assert.equal(config.plugins, undefined);
  });

  it('ships CodeQL, templates, and branch-protection docs', () => {
    const requiredFiles = [
      '.github/workflows/codeql.yml',
      '.github/workflows/release-please.yml',
      '.github/PULL_REQUEST_TEMPLATE.md',
      '.github/ISSUE_TEMPLATE/bug.yml',
      '.github/ISSUE_TEMPLATE/feature.yml',
      'docs/branch-protection.md',
      'docs/adr/0015-turborepo-task-caching.md',
      'docs/adr/0016-dependabot-dependency-updates.md',
      'docs/adr/0017-release-please.md',
      'docs/adr/0018-free-tier-deploy-sentry.md',
      'docs/deployment.md',
      'render.yaml',
      '.github/workflows/deploy-api.yml',
      '.github/workflows/deploy-web.yml',
      '.github/workflows/keep-awake.yml',
      'CHANGELOG.md',
    ];

    for (const file of requiredFiles) {
      assert.ok(existsSync(join(root, file)), `missing ${file}`);
    }

    const codeql = readRepoFile('.github/workflows/codeql.yml');
    assert.match(codeql, /javascript-typescript/);
    assert.match(codeql, /github\/codeql-action\/analyze@v4/);
    assert.match(codeql, /paths-ignore:/);
    assert.match(codeql, /apps\/web\/src\/api\/generated/);

    const ci = readRepoFile('.github/workflows/ci.yml');
    const commitlint = readRepoFile('.github/workflows/commitlint.yml');
    assert.doesNotMatch(ci, /version:\s*10/);
    assert.doesNotMatch(commitlint, /version:\s*10/);
    const pkg = JSON.parse(readRepoFile('package.json'));
    assert.match(pkg.packageManager, /^pnpm@10\./);
  });
});
