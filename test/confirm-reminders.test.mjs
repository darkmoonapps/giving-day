import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  jobsUrlFromHealthUrl,
  runConfirmRemindersJob,
  shouldRunConfirmReminders,
} from '../scripts/confirm-reminders.mjs';

describe('confirm-reminders cron helper', () => {
  it('derives the jobs URL from API_HEALTH_URL', () => {
    assert.equal(
      jobsUrlFromHealthUrl('https://giving-day-api.onrender.com/health'),
      'https://giving-day-api.onrender.com/api/jobs/confirm-reminders'
    );
  });

  it('skips when the cron secret is missing', () => {
    const decision = shouldRunConfirmReminders({
      now: new Date('2026-11-13T10:00:00.000Z'),
      start: '2026-11-01',
      end: '2026-11-30',
      healthUrl: 'https://giving-day-api.onrender.com/health',
      cronSecret: '',
    });

    assert.equal(decision.run, false);
    assert.equal(decision.reason, 'missing-cron-secret');
  });

  it('posts the Bearer secret when the Jerusalem window is open', async () => {
    /** @type {{ url: string, init: RequestInit }[]} */
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push({ url: String(url), init: init ?? {} });
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            attempted: 1,
            sent: 1,
            failed: 0,
            skipped: 0,
            daysProcessed: 1,
          }),
      };
    };

    const result = await runConfirmRemindersJob(
      fetchImpl,
      {
        API_HEALTH_URL: 'https://giving-day-api.onrender.com/health',
        KEEPAWAKE_START: '2026-11-01',
        KEEPAWAKE_END: '2026-11-30',
        CRON_SECRET: 'holon-cron-test-secret',
      },
      new Date('2026-11-13T10:00:00.000Z')
    );

    assert.equal(result.run, true);
    assert.equal(result.status, 200);
    assert.equal(calls.length, 1);
    assert.equal(
      calls[0].url,
      'https://giving-day-api.onrender.com/api/jobs/confirm-reminders'
    );
    assert.equal(
      /** @type {Record<string, string>} */ (calls[0].init.headers)
        .Authorization,
      'Bearer holon-cron-test-secret'
    );
  });
});
