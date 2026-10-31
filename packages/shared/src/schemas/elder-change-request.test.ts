import { describe, expect, it } from 'vitest';
import {
  changeRequestStatusSchema,
  createElderChangeRequestSchema,
  elderChangeRequestChangesSchema,
  elderChangeRequestSchema,
  proposedElderChangesSchema,
  rejectElderChangeRequestSchema,
} from './elder-change-request';

const CITY_ID = '11111111-1111-4111-8111-111111111111';
const ELDER_ID = '12121212-1212-4121-8121-121212121212';
const CONTACT_ID = '14141414-1414-4141-8141-141414141414';
const REQUEST_ID = '17171717-1717-4171-8171-171717171717';
const VOLUNTEER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('changeRequestStatusSchema', () => {
  it('accepts the documented statuses including superseded', () => {
    expect(changeRequestStatusSchema.parse('pending')).toBe('pending');
    expect(changeRequestStatusSchema.parse('approved')).toBe('approved');
    expect(changeRequestStatusSchema.parse('rejected')).toBe('rejected');
    expect(changeRequestStatusSchema.parse('superseded')).toBe('superseded');
  });
});

describe('proposedElderChangesSchema', () => {
  it('accepts allow-listed address and notes fields', () => {
    expect(
      proposedElderChangesSchema.parse({
        street: '4 Park Ave',
        houseNumber: '12',
        notes: 'Entrance is on the side',
      })
    ).toEqual({
      street: '4 Park Ave',
      houseNumber: '12',
      notes: 'Entrance is on the side',
    });
  });

  it('accepts next-of-kin contacts and normalizes a local phone', () => {
    expect(
      proposedElderChangesSchema.parse({
        contacts: [
          {
            name: 'Dana Abraham',
            relation: 'child',
            phone: '050-7777777',
            isPrimary: true,
          },
        ],
      })
    ).toEqual({
      contacts: [
        {
          name: 'Dana Abraham',
          relation: 'child',
          phone: '+972507777777',
          isPrimary: true,
        },
      ],
    });
  });

  it('rejects an empty patch', () => {
    const result = proposedElderChangesSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('change_requests.empty');
    }
  });

  it('rejects unsafe fields such as buildingCode and phone', () => {
    expect(
      proposedElderChangesSchema.safeParse({
        street: '4 Park Ave',
        buildingCode: '9999',
      }).success
    ).toBe(false);
    expect(
      proposedElderChangesSchema.safeParse({
        phone: '+972500000010',
      }).success
    ).toBe(false);
    expect(
      proposedElderChangesSchema.safeParse({
        fullName: 'Elder A',
      }).success
    ).toBe(false);
  });
});

describe('createElderChangeRequestSchema', () => {
  it('accepts a Holon volunteer request with an optional reason', () => {
    expect(
      createElderChangeRequestSchema.parse({
        elderId: ELDER_ID,
        changes: {
          addressNotes: 'Ring the Holon courtyard bell',
        },
        reason: 'The entrance moved to the courtyard',
      })
    ).toEqual({
      elderId: ELDER_ID,
      changes: {
        addressNotes: 'Ring the Holon courtyard bell',
      },
      reason: 'The entrance moved to the courtyard',
    });
  });

  it('rejects a missing elder id', () => {
    expect(
      createElderChangeRequestSchema.safeParse({
        changes: { notes: 'Knock loudly' },
      }).success
    ).toBe(false);
  });
});

describe('elderChangeRequestChangesSchema', () => {
  it('stores from/to pairs for allow-listed fields', () => {
    expect(
      elderChangeRequestChangesSchema.parse({
        street: { from: '1 Test Street', to: '4 Park Ave' },
        notes: { from: null, to: 'Knock loudly' },
      })
    ).toEqual({
      street: { from: '1 Test Street', to: '4 Park Ave' },
      notes: { from: null, to: 'Knock loudly' },
    });
  });

  it('rejects stored changes with no fields', () => {
    expect(elderChangeRequestChangesSchema.safeParse({}).success).toBe(false);
  });
});

describe('elderChangeRequestSchema', () => {
  it('accepts a pending request with current elder values', () => {
    const request = {
      id: REQUEST_ID,
      cityId: CITY_ID,
      elderId: ELDER_ID,
      requestedById: VOLUNTEER_ID,
      changes: {
        street: { from: '1 Test Street', to: '4 Park Ave' },
      },
      reason: 'Moved within Holon',
      status: 'pending',
      reviewedById: null,
      reviewedAt: null,
      reviewNote: null,
      createdAt: '2026-10-31T09:00:00.000Z',
      updatedAt: '2026-10-31T09:00:00.000Z',
      elder: {
        id: ELDER_ID,
        fullName: 'Elder A',
        street: '1 Test Street',
        houseNumber: '1',
        entrance: null,
        floor: null,
        apartment: null,
        addressNotes: null,
        notes: null,
        contacts: [
          {
            id: CONTACT_ID,
            name: 'Contact 1',
            relation: 'child',
            phone: '+972500000001',
            isPrimary: true,
          },
        ],
      },
      requestedBy: {
        id: VOLUNTEER_ID,
        firstName: 'Yonatan',
        lastName: 'Bar',
      },
    };

    expect(elderChangeRequestSchema.parse(request)).toEqual(request);
  });
});

describe('rejectElderChangeRequestSchema', () => {
  it('accepts an empty review note', () => {
    expect(rejectElderChangeRequestSchema.parse({})).toEqual({});
  });

  it('treats a blank review note as null', () => {
    expect(rejectElderChangeRequestSchema.parse({ reviewNote: '  ' })).toEqual({
      reviewNote: null,
    });
  });
});
