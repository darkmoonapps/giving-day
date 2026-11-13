import { describe, expect, it } from 'vitest';
import { cityPastDistributionDaysStatsSchema } from './distribution-day-stats';

describe('cityPastDistributionDaysStatsSchema', () => {
  const payload = {
    cityId: '11111111-1111-4111-8111-111111111111',
    days: [
      {
        dayId: '55555555-5555-4555-8555-555555555555',
        date: '2026-10-15',
        status: 'closed' as const,
        eldersServed: 2,
        packagesDelivered: 2,
        packagesNotDelivered: 1,
        packagesOpen: 0,
        volunteersConfirmed: 3,
        volunteersDeclined: 1,
      },
      {
        dayId: '66666666-6666-4666-8666-666666666666',
        date: '2026-09-15',
        status: 'closed' as const,
        eldersServed: 1,
        packagesDelivered: 1,
        packagesNotDelivered: 0,
        packagesOpen: 1,
        volunteersConfirmed: 2,
        volunteersDeclined: 0,
      },
    ],
    totals: {
      days: 2,
      eldersServed: 3,
      packagesDelivered: 3,
      packagesNotDelivered: 1,
      packagesOpen: 1,
      volunteersConfirmed: 5,
      volunteersDeclined: 1,
    },
  };

  it('accepts Holon past-day stats with totals', () => {
    expect(cityPastDistributionDaysStatsSchema.parse(payload)).toEqual(payload);
  });

  it('rejects a negative count', () => {
    expect(
      cityPastDistributionDaysStatsSchema.safeParse({
        ...payload,
        totals: { ...payload.totals, eldersServed: -1 },
      }).success
    ).toBe(false);
  });
});
