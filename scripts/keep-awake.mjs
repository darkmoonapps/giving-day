import { pathToFileURL } from 'node:url';

const JERUSALEM_TIME_ZONE = 'Asia/Jerusalem';
const WINDOW_START_HOUR = 8;
const WINDOW_END_HOUR = 22;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * @param {Date} now
 * @param {string} timeZone
 * @returns {{ year: number, month: number, day: number, hour: number, minute: number }}
 */
export function getZonedDateTimeParts(now, timeZone = JERUSALEM_TIME_ZONE) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(now).map((part) => [part.type, part.value])
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

/**
 * @param {{ year: number, month: number, day: number, hour: number, minute: number }} parts
 * @returns {boolean}
 */
export function isWithinJerusalemDayWindow(parts) {
  return parts.hour >= WINDOW_START_HOUR && parts.hour < WINDOW_END_HOUR;
}

/**
 * @param {string | undefined} value
 * @returns {boolean}
 */
function isDateOnly(value) {
  return typeof value === 'string' && DATE_ONLY_PATTERN.test(value);
}

/**
 * @param {Date} now
 * @param {{ year: number, month: number, day: number }} parts
 * @param {string | undefined} start
 * @param {string | undefined} end
 * @returns {boolean}
 */
export function isWithinKeepAwakeRange(now, parts, start, end) {
  if (typeof start !== 'string' || start.trim().length === 0) {
    return false;
  }
  if (typeof end !== 'string' || end.trim().length === 0) {
    return false;
  }

  if (isDateOnly(start) && isDateOnly(end)) {
    const today = `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
    return today >= start && today <= end;
  }

  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return false;
  }

  const timestamp = now.getTime();
  return timestamp >= startMs && timestamp <= endMs;
}

/**
 * @param {{
 *   now?: Date,
 *   start?: string,
 *   end?: string,
 *   healthUrl?: string,
 *   timeZone?: string,
 * }} options
 * @returns {{ ping: boolean, reason: string }}
 */
export function shouldPingKeepAwake(options) {
  const now = options.now ?? new Date();
  const timeZone = options.timeZone ?? JERUSALEM_TIME_ZONE;
  const parts = getZonedDateTimeParts(now, timeZone);

  if (typeof options.healthUrl !== 'string' || options.healthUrl.trim().length === 0) {
    return { ping: false, reason: 'missing-health-url' };
  }

  if (!isWithinKeepAwakeRange(now, parts, options.start, options.end)) {
    return { ping: false, reason: 'outside-keepawake-range' };
  }

  if (!isWithinJerusalemDayWindow(parts)) {
    return { ping: false, reason: 'outside-jerusalem-hours' };
  }

  return { ping: true, reason: 'ok' };
}

/**
 * @param {typeof fetch} fetchImpl
 * @param {NodeJS.ProcessEnv} env
 * @param {Date} [now]
 * @returns {Promise<{ ping: boolean, reason: string, status?: number }>}
 */
export async function runKeepAwake(fetchImpl, env, now = new Date()) {
  const decision = shouldPingKeepAwake({
    now,
    start: env.KEEPAWAKE_START,
    end: env.KEEPAWAKE_END,
    healthUrl: env.API_HEALTH_URL,
  });

  if (!decision.ping) {
    return decision;
  }

  const response = await fetchImpl(env.API_HEALTH_URL, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`health check failed: ${response.status}`);
  }

  return { ...decision, status: response.status };
}

async function main() {
  const result = await runKeepAwake(fetch, process.env);
  if (!result.ping) {
    console.log(`skip: ${result.reason}`);
    return;
  }

  console.log(`pinged /health (${result.status})`);
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
