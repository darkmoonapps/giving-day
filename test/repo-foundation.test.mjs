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
    const packages = [
      '.',
      'apps/web',
      'apps/api',
      'packages/shared',
      'packages/ui',
    ];

    for (const pkg of packages) {
      assert.ok(config.packages[pkg], `missing release-please package ${pkg}`);
      assert.equal(manifest[pkg], '0.1.0');
    }

    const pluginTypes = config.plugins.map(
      (/** @type {{ type: string }} */ plugin) => plugin.type
    );
    assert.ok(pluginTypes.includes('node-workspace'));
    assert.ok(pluginTypes.includes('linked-versions'));
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
      'CHANGELOG.md',
    ];

    for (const file of requiredFiles) {
      assert.ok(existsSync(join(root, file)), `missing ${file}`);
    }

    const codeql = readRepoFile('.github/workflows/codeql.yml');
    assert.match(codeql, /javascript-typescript/);
    assert.match(codeql, /github\/codeql-action\/analyze@v4/);
  });
});
