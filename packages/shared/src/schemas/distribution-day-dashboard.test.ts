import { describe, expect, it } from 'vitest';
import { distributionDayDashboardSchema } from './distribution-day-dashboard';

describe('distributionDayDashboardSchema', () => {
  const payload = {
    dayId: '33333333-3333-4333-8333-333333333333',
    cityId: '11111111-1111-4111-8111-111111111111',
    date: '2026-11-15',
    startTime: '09:00:00',
    endTime: '14:00:00',
    status: 'published' as const,
    volunteers: {
      total: 3,
      confirmed: 1,
      pending: 1,
      declined: 1,
    },
    deliveries: {
      unassigned: 1,
      assigned: 1,
      picked: 0,
      delivered: 0,
      notDelivered: 0,
      cancelled: 0,
    },
    unassignedElders: [
      {
        elderId: '13131313-1313-4131-8131-131313131313',
        fullName: 'Yosef Abraham',
      },
    ],
  };

  it('accepts a coordinator day overview with Holon fixture counts', () => {
    expect(distributionDayDashboardSchema.parse(payload)).toEqual(payload);
  });

  it('rejects a negative count', () => {
    expect(
      distributionDayDashboardSchema.safeParse({
        ...payload,
        volunteers: { ...payload.volunteers, pending: -1 },
      }).success
    ).toBe(false);
  });
});
