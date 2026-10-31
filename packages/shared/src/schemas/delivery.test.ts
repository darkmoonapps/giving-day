import { describe, expect, it } from 'vitest';
import {
  assignDeliverySchema,
  coordinatorDeliveriesResponseSchema,
  isCoordinatorDeliveriesResponse,
  updateDeliveryStatusSchema,
  volunteerDeliveriesResponseSchema,
} from './delivery';

const CITY_ID = '11111111-1111-4111-8111-111111111111';
const DAY_ID = '33333333-3333-4333-8333-333333333333';
const ELDER_ID = '12121212-1212-4121-8121-121212121212';
const VOLUNTEER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const DELIVERY_ID = '16161616-1616-4161-8161-161616161616';
const MATCH_ID = '14141414-1414-4141-8141-141414141414';

const elder = {
  id: ELDER_ID,
  fullName: 'Rivkah Levi',
  street: '12 Example St',
  houseNumber: '12',
  entrance: 'B',
  floor: '3',
  apartment: '7',
  addressNotes: 'Knock loudly',
  notes: 'Entrance is around the back',
  contacts: [
    {
      name: 'Tamar Levi',
      relation: 'child' as const,
      phone: '+972506666666',
      isPrimary: true,
    },
  ],
};

describe('assignDeliverySchema', () => {
  it('accepts a volunteer id or null', () => {
    expect(assignDeliverySchema.parse({ volunteerId: VOLUNTEER_ID })).toEqual({
      volunteerId: VOLUNTEER_ID,
    });
    expect(assignDeliverySchema.parse({ volunteerId: null })).toEqual({
      volunteerId: null,
    });
  });

  it('rejects a missing volunteer id', () => {
    expect(assignDeliverySchema.safeParse({}).success).toBe(false);
    expect(
      assignDeliverySchema.safeParse({ volunteerId: 'not-a-uuid' }).success
    ).toBe(false);
  });
});

describe('volunteerDeliveriesResponseSchema', () => {
  it('accepts a volunteer own-delivery list without assignment fields', () => {
    const payload = {
      dayId: DAY_ID,
      cityId: CITY_ID,
      cityNameHe: 'חולון',
      cityNameEn: 'Holon',
      centerAddress: '10 Warehouse Rd, Holon',
      deliveries: [
        {
          id: DELIVERY_ID,
          cityId: CITY_ID,
          dayId: DAY_ID,
          status: 'assigned' as const,
          note: null,
          notDeliveredReason: null,
          elder,
        },
      ],
    };

    expect(volunteerDeliveriesResponseSchema.parse(payload)).toEqual(payload);
    expect(payload.deliveries[0]?.elder.contacts[0]?.name).toBe('Tamar Levi');
  });

  it('allows an empty distribution center address when settings omit one', () => {
    const payload = {
      dayId: DAY_ID,
      cityId: CITY_ID,
      cityNameHe: 'חולון',
      cityNameEn: 'Holon',
      centerAddress: '',
      deliveries: [],
    };

    expect(volunteerDeliveriesResponseSchema.parse(payload)).toEqual(payload);
  });
});

describe('coordinatorDeliveriesResponseSchema', () => {
  it('accepts assigned and unassigned rows plus assignable volunteers', () => {
    const payload = {
      dayId: DAY_ID,
      cityId: CITY_ID,
      cityNameHe: 'חולון',
      cityNameEn: 'Holon',
      centerAddress: '10 Warehouse Rd, Holon',
      unassignedCount: 1,
      assignableVolunteers: [
        {
          id: VOLUNTEER_ID,
          firstName: 'Yonatan',
          lastName: 'Bar',
        },
      ],
      deliveries: [
        {
          id: DELIVERY_ID,
          cityId: CITY_ID,
          dayId: DAY_ID,
          status: 'unassigned' as const,
          note: null,
          notDeliveredReason: null,
          volunteerId: null,
          matchId: MATCH_ID,
          assignedAt: null,
          volunteer: null,
          replacementSuggestions: [
            {
              id: VOLUNTEER_ID,
              firstName: 'Yonatan',
              lastName: 'Bar',
              homeArea: 'Weizmann',
            },
          ],
          elder,
        },
      ],
    };

    expect(coordinatorDeliveriesResponseSchema.parse(payload)).toEqual(payload);
    expect(isCoordinatorDeliveriesResponse(payload)).toBe(true);
  });
});

describe('updateDeliveryStatusSchema', () => {
  it('accepts picked and delivered without a note', () => {
    expect(updateDeliveryStatusSchema.parse({ status: 'picked' })).toEqual({
      status: 'picked',
    });
    expect(updateDeliveryStatusSchema.parse({ status: 'delivered' })).toEqual({
      status: 'delivered',
    });
  });

  it('requires a note and reason for not delivered', () => {
    expect(
      updateDeliveryStatusSchema.parse({
        status: 'not_delivered',
        note: '  Elder was not home in Holon  ',
        notDeliveredReason: 'not_home',
      })
    ).toEqual({
      status: 'not_delivered',
      note: 'Elder was not home in Holon',
      notDeliveredReason: 'not_home',
    });
    expect(
      updateDeliveryStatusSchema.safeParse({ status: 'not_delivered' }).success
    ).toBe(false);
    expect(
      updateDeliveryStatusSchema.safeParse({
        status: 'not_delivered',
        note: '   ',
        notDeliveredReason: 'not_home',
      }).success
    ).toBe(false);
    expect(
      updateDeliveryStatusSchema.safeParse({
        status: 'not_delivered',
        note: 'Elder was not home',
      }).success
    ).toBe(false);
  });

  it('rejects coordinator-only or skipped statuses', () => {
    expect(
      updateDeliveryStatusSchema.safeParse({ status: 'assigned' }).success
    ).toBe(false);
    expect(
      updateDeliveryStatusSchema.safeParse({ status: 'unassigned' }).success
    ).toBe(false);
    expect(
      updateDeliveryStatusSchema.safeParse({ status: 'cancelled' }).success
    ).toBe(false);
  });
});
