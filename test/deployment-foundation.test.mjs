import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

/**
 * @param {string} markdown
 * @returns {URL[]}
 */
function markdownHttpsLinks(markdown) {
  const links = [];
  const pattern = /\]\((https:\/\/[^)\s]+)\)/g;
  let match = pattern.exec(markdown);

  while (match !== null) {
    try {
      links.push(new URL(match[1]));
    } catch {
      // Ignore malformed markdown hrefs in this assertion helper.
    }
    match = pattern.exec(markdown);
  }

  return links;
}

/**
 * @param {readonly URL[]} links
 * @param {string} hostname
 * @param {string} pathname
 * @returns {boolean}
 */
function hasExactHttpsLink(links, hostname, pathname) {
  return links.some(
    (link) =>
      link.protocol === 'https:' &&
      link.hostname === hostname &&
      link.pathname === pathname
  );
}

describe('free-tier deploy wiring', () => {
  it('declares a free Frankfurt Render web service with /health and migrate deploy', () => {
    const blueprint = readRepoFile('render.yaml');

    assert.match(blueprint, /plan:\s*free/);
    assert.match(blueprint, /region:\s*frankfurt/);
    assert.match(blueprint, /healthCheckPath:\s*\/health/);
    assert.match(blueprint, /prisma migrate deploy/);
    assert.match(blueprint, /autoDeployTrigger:\s*'off'/);
    assert.doesNotMatch(blueprint, /plan:\s*(starter|standard|pro)/i);
  });

  it('references GitHub secrets and variables by name only', () => {
    const deployApi = readRepoFile('.github/workflows/deploy-api.yml');
    const deployWeb = readRepoFile('.github/workflows/deploy-web.yml');
    const keepAwake = readRepoFile('.github/workflows/keep-awake.yml');
    const combined = `${deployApi}\n${deployWeb}\n${keepAwake}`;

    assert.match(deployApi, /secrets\.DATABASE_URL/);
    assert.match(deployApi, /secrets\.RENDER_DEPLOY_HOOK_URL/);
    assert.match(deployApi, /prisma migrate deploy/);
    assert.match(deployWeb, /secrets\.CLOUDFLARE_API_TOKEN/);
    assert.match(deployWeb, /secrets\.CLOUDFLARE_ACCOUNT_ID/);
    assert.match(deployWeb, /secrets\.SENTRY_AUTH_TOKEN/);
    assert.match(deployWeb, /secrets\.VITE_SENTRY_DSN/);
    assert.match(deployWeb, /vars\.VITE_API_URL/);
    assert.match(deployWeb, /vars\.CLOUDFLARE_PAGES_PROJECT/);
    assert.match(
      deployWeb,
      /npm --prefix "\$\{RUNNER_TEMP\}\/wrangler-cli" install wrangler@4/
    );
    assert.match(
      deployWeb,
      /workingDirectory:\s*\$\{\{\s*runner\.temp\s*\}\}\/wrangler-cli/
    );
    assert.match(
      deployWeb,
      /pages deploy \$\{\{\s*github\.workspace\s*\}\}\/apps\/web\/dist/
    );
    assert.match(deployWeb, /--branch=\$\{\{\s*github\.ref_name\s*\}\}/);
    assert.match(deployWeb, /--commit-hash=\$\{\{\s*github\.sha\s*\}\}/);
    assert.doesNotMatch(deployWeb, /--commit-message=/);
    assert.doesNotMatch(
      deployWeb,
      /VITE_API_URL:\s*['"]https?:\/\/giving-day-api/
    );
    assert.match(keepAwake, /cron:\s*'\*\/10 \* \* \* \*'/);
    assert.match(keepAwake, /vars\.KEEPAWAKE_START/);
    assert.match(keepAwake, /vars\.KEEPAWAKE_END/);
    assert.match(keepAwake, /vars\.API_HEALTH_URL/);
    assert.doesNotMatch(combined, /postgres(?:ql)?:\/\/[^\s$]/i);
    assert.doesNotMatch(combined, /sntrys_/);
    assert.doesNotMatch(combined, /eyJ[A-Za-z0-9_-]{20,}/);
  });

  it('documents secret names, Render 750 hours, and Neon free limits', () => {
    const docs = readRepoFile('docs/deployment.md');

    assert.match(docs, /DATABASE_URL/);
    assert.match(docs, /RENDER_DEPLOY_HOOK_URL/);
    assert.match(docs, /CLOUDFLARE_API_TOKEN/);
    assert.match(docs, /KEEPAWAKE_START/);
    assert.match(docs, /750/);
    const docsLinks = markdownHttpsLinks(docs);
    assert.equal(
      hasExactHttpsLink(docsLinks, 'render.com', '/docs/free'),
      true
    );
    assert.equal(
      hasExactHttpsLink(docsLinks, 'neon.com', '/docs/introduction/plans'),
      true
    );
    assert.match(docs, /--branch=/);
    assert.match(docs, /--commit-hash=/);
    assert.match(docs, /100 CU-hours/);
    assert.match(docs, /sendDefaultPii/);
    assert.doesNotMatch(docs, /postgresql:\/\/[^:]+:[^@]+@/);
  });
});
