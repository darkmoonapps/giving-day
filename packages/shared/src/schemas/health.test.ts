import { describe, expect, it } from 'vitest';
import { healthResponseSchema } from './health';

describe('healthResponseSchema', () => {
  it('accepts a healthy API payload', () => {
    const payload = {
      status: 'healthy',
      timestamp: '2026-01-15T10:00:00.000Z',
      database: { connected: true },
    };

    expect(healthResponseSchema.parse(payload)).toEqual(payload);
  });

  it('rejects an incomplete payload', () => {
    expect(
      healthResponseSchema.safeParse({
        status: 'healthy',
        timestamp: 'not-a-date',
        database: { connected: true },
      }).success
    ).toBe(false);
  });
});
