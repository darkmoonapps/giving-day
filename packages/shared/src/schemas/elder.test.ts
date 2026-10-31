import { describe, expect, it } from 'vitest';
import {
  createElderSchema,
  elderSchema,
  listEldersQuerySchema,
  updateElderSchema,
} from './elder';

const CITY_ID = '11111111-1111-4111-8111-111111111111';
const ELDER_ID = '12121212-1212-4121-8121-121212121212';
const CONTACT_ID = '14141414-1414-4141-8141-141414141414';

function elderFixture(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    id: ELDER_ID,
    cityId: CITY_ID,
    fullName: 'Elder A',
    phone: '+972500000010',
    phoneAlt: null,
    language: 'he',
    street: '1 Test Street',
    houseNumber: '1',
    entrance: null,
    floor: null,
    apartment: null,
    buildingCode: null,
    addressNotes: null,
    lat: null,
    lng: null,
    geocodeStatus: 'pending',
    status: 'active',
    statusReason: null,
    notes: null,
    archivedAt: null,
    createdAt: '2026-10-01T09:00:00.000Z',
    updatedAt: '2026-10-01T09:00:00.000Z',
    contacts: [
      {
        id: CONTACT_ID,
        name: 'Contact 1',
        relation: 'child',
        phone: '+972500000001',
        isPrimary: true,
      },
    ],
    ...overrides,
  };
}

describe('elderSchema', () => {
  it('accepts a factory elder with next-of-kin contacts', () => {
    const elder = elderFixture();
    expect(elderSchema.parse(elder)).toEqual(elder);
  });

  it('rejects a non-E.164 phone', () => {
    expect(
      elderSchema.safeParse(elderFixture({ phone: '050-0000010' })).success
    ).toBe(false);
  });
});

describe('createElderSchema', () => {
  it('accepts required fields and normalizes a local phone', () => {
    expect(
      createElderSchema.parse({
        fullName: 'Elder A',
        street: '1 Test Street',
        houseNumber: '1',
        phone: '050-0000010',
        contacts: [
          {
            name: 'Contact 1',
            relation: 'child',
            phone: '050-0000001',
          },
        ],
      })
    ).toEqual({
      fullName: 'Elder A',
      street: '1 Test Street',
      houseNumber: '1',
      phone: '+972500000010',
      contacts: [
        {
          name: 'Contact 1',
          relation: 'child',
          phone: '+972500000001',
          isPrimary: false,
        },
      ],
    });
  });

  it('treats blank optional phones as null', () => {
    expect(
      createElderSchema.parse({
        fullName: 'Elder A',
        street: '1 Test Street',
        houseNumber: '1',
        phone: '',
        phoneAlt: '   ',
      })
    ).toMatchObject({
      phone: null,
      phoneAlt: null,
    });
  });

  it('rejects a missing full name', () => {
    expect(
      createElderSchema.safeParse({
        street: '1 Test Street',
        houseNumber: '1',
      }).success
    ).toBe(false);
  });

  it('rejects lat without lng', () => {
    const result = createElderSchema.safeParse({
      fullName: 'Elder A',
      street: '1 Test Street',
      houseNumber: '1',
      lat: 32.01,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('elders.lat_lng_required');
    }
  });
});

describe('updateElderSchema', () => {
  it('allows a partial update', () => {
    expect(updateElderSchema.parse({ notes: 'Knock loudly' })).toEqual({
      notes: 'Knock loudly',
    });
  });

  it('allows clearing a phone', () => {
    expect(updateElderSchema.parse({ phone: null })).toEqual({ phone: null });
  });
});

describe('listEldersQuerySchema', () => {
  it('accepts a status filter', () => {
    expect(listEldersQuerySchema.parse({ status: 'paused' })).toEqual({
      status: 'paused',
    });
  });

  it('rejects an unknown status', () => {
    expect(listEldersQuerySchema.safeParse({ status: 'unknown' }).success).toBe(
      false
    );
  });
});
