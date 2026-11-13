import { pathToFileURL } from 'node:url';
import {
  getZonedDateTimeParts,
  isWithinJerusalemDayWindow,
  isWithinKeepAwakeRange,
} from './keep-awake.mjs';

/**
 * @param {string | undefined} healthUrl
 * @returns {string | null}
 */
export function jobsUrlFromHealthUrl(healthUrl) {
  if (typeof healthUrl !== 'string' || healthUrl.trim().length === 0) {
    return null;
  }

  try {
    const url = new URL(healthUrl.trim());
    if (!/\/health\/?$/.test(url.pathname)) {
      return null;
    }
    url.pathname = '/api/jobs/pickup-status-reminders';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * @param {{
 *   now?: Date,
 *   start?: string,
 *   end?: string,
 *   healthUrl?: string,
 *   cronSecret?: string,
 *   timeZone?: string,
 * }} options
 * @returns {{ run: boolean, reason: string, jobsUrl?: string }}
 */
export function shouldRunPickupStatusReminders(options) {
  const now = options.now ?? new Date();
  const timeZone = options.timeZone ?? 'Asia/Jerusalem';
  const parts = getZonedDateTimeParts(now, timeZone);
  const jobsUrl = jobsUrlFromHealthUrl(options.healthUrl);

  if (jobsUrl === null) {
    return { run: false, reason: 'missing-or-invalid-health-url' };
  }

  if (
    typeof options.cronSecret !== 'string' ||
    options.cronSecret.trim().length === 0
  ) {
    return { run: false, reason: 'missing-cron-secret' };
  }

  if (!isWithinKeepAwakeRange(now, parts, options.start, options.end)) {
    return { run: false, reason: 'outside-keepawake-range' };
  }

  if (!isWithinJerusalemDayWindow(parts)) {
    return { run: false, reason: 'outside-jerusalem-hours' };
  }

  return { run: true, reason: 'ok', jobsUrl };
}

/**
 * @param {typeof fetch} fetchImpl
 * @param {NodeJS.ProcessEnv} env
 * @param {Date} [now]
 * @returns {Promise<{ run: boolean, reason: string, status?: number, body?: unknown }>}
 */
export async function runPickupStatusRemindersJob(
  fetchImpl,
  env,
  now = new Date()
) {
  const decision = shouldRunPickupStatusReminders({
    now,
    start: env.KEEPAWAKE_START,
    end: env.KEEPAWAKE_END,
    healthUrl: env.API_HEALTH_URL,
    cronSecret: env.CRON_SECRET,
  });

  if (!decision.run || decision.jobsUrl === undefined) {
    return decision;
  }

  const response = await fetchImpl(decision.jobsUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.CRON_SECRET}`,
      Accept: 'application/json',
    },
  });

  const text = await response.text();
  let body = undefined;
  if (text.length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    throw new Error(
      `pickup-status-reminders job failed: ${response.status} ${typeof body === 'string' ? body : JSON.stringify(body)}`
    );
  }

  return { ...decision, status: response.status, body };
}

async function main() {
  const result = await runPickupStatusRemindersJob(fetch, process.env);
  if (!result.run) {
    console.log(`skip: ${result.reason}`);
    return;
  }

  console.log(
    `pickup-status-reminders ok (${result.status}): ${JSON.stringify(result.body)}`
  );
}

const isDirectRun =
  process.argv[1] !== undefined &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
