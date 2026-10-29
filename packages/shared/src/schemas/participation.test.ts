import { describe, expect, it } from 'vitest';
import {
  dayParticipationsResponseSchema,
  ownDayParticipationSchema,
  respondToDistributionDaySchema,
} from './participation';

const ownParticipation = {
  id: '44444444-4444-4444-8444-444444444444',
  cityId: '11111111-1111-4111-8111-111111111111',
  dayId: '33333333-3333-4333-8333-333333333333',
  volunteerId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  status: 'confirmed' as const,
  respondedAt: '2026-10-29T10:00:00.000Z',
  cancelReason: null,
};

describe('respondToDistributionDaySchema', () => {
  it('accepts a confirm payload without a reason', () => {
    expect(
      respondToDistributionDaySchema.parse({ status: 'confirmed' })
    ).toEqual({ status: 'confirmed' });
  });

  it('rejects a confirm payload that includes a cancelReason', () => {
    expect(
      respondToDistributionDaySchema.safeParse({
        status: 'confirmed',
        cancelReason: 'Family event in Holon',
      }).success
    ).toBe(false);
  });

  it('requires a trimmed reason when declining', () => {
    expect(
      respondToDistributionDaySchema.parse({
        status: 'declined',
        cancelReason: '  Family event in Holon  ',
      })
    ).toEqual({
      status: 'declined',
      cancelReason: 'Family event in Holon',
    });
    expect(
      respondToDistributionDaySchema.safeParse({ status: 'declined' }).success
    ).toBe(false);
    expect(
      respondToDistributionDaySchema.safeParse({
        status: 'declined',
        cancelReason: '   ',
      }).success
    ).toBe(false);
  });
});

describe('ownDayParticipationSchema', () => {
  it('accepts a volunteer confirm row', () => {
    expect(ownDayParticipationSchema.parse(ownParticipation)).toEqual(
      ownParticipation
    );
  });

  it('rejects invited rows on the volunteer own-response contract', () => {
    expect(
      ownDayParticipationSchema.safeParse({
        ...ownParticipation,
        status: 'invited',
      }).success
    ).toBe(false);
  });
});

describe('dayParticipationsResponseSchema', () => {
  it('accepts coordinator rows including no-response and a decline reason', () => {
    const payload = {
      dayId: ownParticipation.dayId,
      cityId: ownParticipation.cityId,
      responses: [
        {
          volunteerId: ownParticipation.volunteerId,
          firstName: 'Yonatan',
          lastName: 'Bar',
          responseStatus: 'confirmed' as const,
          cancelReason: null,
          respondedAt: ownParticipation.respondedAt,
        },
        {
          volunteerId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
          firstName: 'Maya',
          lastName: 'Cohen',
          responseStatus: 'declined' as const,
          cancelReason: 'Out of town',
          respondedAt: '2026-10-29T11:00:00.000Z',
        },
        {
          volunteerId: '99999999-9999-4999-8999-999999999999',
          firstName: 'Dana',
          lastName: 'Levi',
          responseStatus: 'no_response' as const,
          cancelReason: null,
          respondedAt: null,
        },
      ],
    };

    expect(dayParticipationsResponseSchema.parse(payload)).toEqual(payload);
  });
});
