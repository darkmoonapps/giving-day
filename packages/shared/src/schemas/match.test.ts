import { describe, expect, it } from 'vitest';
import {
  createPermanentMatchSchema,
  endPermanentMatchSchema,
  permanentMatchSchema,
  permanentMatchesResponseSchema,
} from './match';

const CITY_ID = '11111111-1111-4111-8111-111111111111';
const ELDER_ID = '12121212-1212-4121-8121-121212121212';
const VOLUNTEER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const MATCH_ID = '15151515-1515-4151-8151-151515151515';

const currentMatch = {
  id: MATCH_ID,
  cityId: CITY_ID,
  elderId: ELDER_ID,
  volunteerId: VOLUNTEER_ID,
  type: 'permanent' as const,
  startsAt: '2026-10-01',
  endsAt: null,
  endReason: null,
  createdAt: '2026-10-01T09:00:00.000Z',
  updatedAt: '2026-10-01T09:00:00.000Z',
  elder: {
    id: ELDER_ID,
    fullName: 'Rivkah Levi',
    status: 'active' as const,
  },
  volunteer: {
    id: VOLUNTEER_ID,
    firstName: 'Yonatan',
    lastName: 'Bar',
  },
};

describe('permanentMatchSchema', () => {
  it('accepts a current Holon permanent match with summaries', () => {
    expect(permanentMatchSchema.parse(currentMatch)).toEqual(currentMatch);
  });

  it('rejects a one-time match on the permanent contract', () => {
    expect(
      permanentMatchSchema.safeParse({
        ...currentMatch,
        type: 'one_time',
      }).success
    ).toBe(false);
  });
});

describe('createPermanentMatchSchema', () => {
  it('accepts elder and volunteer ids', () => {
    expect(
      createPermanentMatchSchema.parse({
        elderId: ELDER_ID,
        volunteerId: VOLUNTEER_ID,
      })
    ).toEqual({
      elderId: ELDER_ID,
      volunteerId: VOLUNTEER_ID,
    });
  });

  it('accepts an optional start date', () => {
    expect(
      createPermanentMatchSchema.parse({
        elderId: ELDER_ID,
        volunteerId: VOLUNTEER_ID,
        startsAt: '2026-11-01',
      }).startsAt
    ).toBe('2026-11-01');
  });

  it('rejects a missing volunteer id', () => {
    expect(
      createPermanentMatchSchema.safeParse({ elderId: ELDER_ID }).success
    ).toBe(false);
  });
});

describe('endPermanentMatchSchema', () => {
  it('requires an end reason', () => {
    expect(endPermanentMatchSchema.parse({ endReason: 'reassigned' })).toEqual({
      endReason: 'reassigned',
    });
  });

  it('rejects an unknown end reason', () => {
    expect(
      endPermanentMatchSchema.safeParse({ endReason: 'moved_away' }).success
    ).toBe(false);
  });
});

describe('permanentMatchesResponseSchema', () => {
  it('accepts current matches plus people available to match', () => {
    const payload = {
      matches: [currentMatch],
      unmatchedElders: [
        {
          id: '13131313-1313-4131-8131-131313131313',
          fullName: 'Yosef Abraham',
          status: 'active' as const,
        },
      ],
      matchableVolunteers: [
        {
          id: '99999999-9999-4999-8999-999999999999',
          firstName: 'Dana',
          lastName: 'Levi',
        },
      ],
    };

    expect(permanentMatchesResponseSchema.parse(payload)).toEqual(payload);
  });
});
