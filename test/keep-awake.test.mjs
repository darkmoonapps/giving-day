import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isWithinJerusalemDayWindow,
  runKeepAwake,
  shouldPingKeepAwake,
} from '../scripts/keep-awake.mjs';

describe('keep-awake window', () => {
  it('allows 08:00–21:59 and skips 22:00 in Jerusalem', () => {
    assert.equal(
      isWithinJerusalemDayWindow({ hour: 8, minute: 0 }),
      true
    );
    assert.equal(
      isWithinJerusalemDayWindow({ hour: 21, minute: 50 }),
      true
    );
    assert.equal(
      isWithinJerusalemDayWindow({ hour: 7, minute: 59 }),
      false
    );
    assert.equal(
      isWithinJerusalemDayWindow({ hour: 22, minute: 0 }),
      false
    );
  });

  it('skips when campaign variables or the health URL are missing', () => {
    const noonUtc = new Date('2026-01-15T10:00:00.000Z');

    assert.equal(
      shouldPingKeepAwake({
        now: noonUtc,
        start: '2026-01-01',
        end: '2026-12-31',
      }).reason,
      'missing-health-url'
    );
    assert.equal(
      shouldPingKeepAwake({
        now: noonUtc,
        healthUrl: 'https://api.example.test/health',
      }).reason,
      'outside-keepawake-range'
    );
  });

  it('pings only during Jerusalem daytime inside the campaign window', () => {
    const healthUrl = 'https://api.example.test/health';

    assert.equal(
      shouldPingKeepAwake({
        now: new Date('2026-01-15T06:00:00.000Z'),
        start: '2026-01-01',
        end: '2026-12-31',
        healthUrl,
      }).ping,
      true
    );
    assert.equal(
      shouldPingKeepAwake({
        now: new Date('2026-01-15T05:00:00.000Z'),
        start: '2026-01-01',
        end: '2026-12-31',
        healthUrl,
      }).reason,
      'outside-jerusalem-hours'
    );
    assert.equal(
      shouldPingKeepAwake({
        now: new Date('2026-01-15T20:00:00.000Z'),
        start: '2026-01-01',
        end: '2026-12-31',
        healthUrl,
      }).reason,
      'outside-jerusalem-hours'
    );
    assert.equal(
      shouldPingKeepAwake({
        now: new Date('2026-01-15T10:00:00.000Z'),
        start: '2026-02-01',
        end: '2026-12-31',
        healthUrl,
      }).reason,
      'outside-keepawake-range'
    );
  });

  it('uses ISO datetimes when the campaign bounds are not date-only', () => {
    const healthUrl = 'https://api.example.test/health';
    assert.equal(
      shouldPingKeepAwake({
        now: new Date('2026-07-15T05:00:00.000Z'),
        start: '2026-07-01T00:00:00.000Z',
        end: '2026-07-31T23:59:59.000Z',
        healthUrl,
      }).ping,
      true
    );
  });

  it('skips without fetching outside the window and pings /health otherwise', async () => {
    let called = false;
    const fetchImpl = async () => {
      called = true;
      return { ok: true, status: 200 };
    };

    const skipped = await runKeepAwake(
      fetchImpl,
      {
        KEEPAWAKE_START: '2026-01-01',
        KEEPAWAKE_END: '2026-12-31',
        API_HEALTH_URL: 'https://api.example.test/health',
      },
      new Date('2026-01-15T21:00:00.000Z')
    );
    assert.equal(skipped.ping, false);
    assert.equal(called, false);

    const pinged = await runKeepAwake(
      fetchImpl,
      {
        KEEPAWAKE_START: '2026-01-01',
        KEEPAWAKE_END: '2026-12-31',
        API_HEALTH_URL: 'https://api.example.test/health',
      },
      new Date('2026-01-15T10:00:00.000Z')
    );
    assert.equal(pinged.ping, true);
    assert.equal(pinged.status, 200);
    assert.equal(called, true);
  });
});
