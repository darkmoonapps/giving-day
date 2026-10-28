import { describe, expect, it } from 'vitest';
import {
  dateOnlySchema,
  distributionDayCoordinatorSchema,
  distributionDayVolunteerSchema,
  openDistributionDaySchema,
} from './distribution-day';

describe('distribution-day schemas', () => {
  const volunteerDay = {
    id: '33333333-3333-4333-8333-333333333333',
    cityId: '11111111-1111-4111-8111-111111111111',
    date: '2026-11-15',
    startTime: '09:00:00',
    endTime: '14:00:00',
    notesForVolunteers: 'Bring a folding cart',
    addOns: ['holiday honey'],
    status: 'published' as const,
    publishedAt: '2026-10-28T09:00:00.000Z',
    closedAt: null,
  };

  it('accepts a volunteer-visible open day without internal notes', () => {
    expect(distributionDayVolunteerSchema.parse(volunteerDay)).toEqual(
      volunteerDay
    );
    expect(
      distributionDayVolunteerSchema.parse({
        ...volunteerDay,
        internalNotes: 'do not leak',
        createdById: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      })
    ).toEqual(volunteerDay);
  });

  it('accepts coordinator fields on the coordinator schema', () => {
    const coordinatorDay = {
      ...volunteerDay,
      internalNotes: 'Need extra rice bags',
      createdById: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    };

    expect(distributionDayCoordinatorSchema.parse(coordinatorDay)).toEqual(
      coordinatorDay
    );
  });

  it('requires a calendar date to open a day', () => {
    expect(dateOnlySchema.safeParse('2026-11-15').success).toBe(true);
    expect(dateOnlySchema.safeParse('2026-13-01').success).toBe(false);
    expect(dateOnlySchema.safeParse('2026-11-15T09:00:00.000Z').success).toBe(
      false
    );
    expect(openDistributionDaySchema.parse({ date: '2026-11-15' })).toEqual({
      date: '2026-11-15',
    });
  });
});
