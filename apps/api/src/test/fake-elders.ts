import type { Elder, ElderContact } from '@prisma/client';
import { CITY_A_ID } from './fake-users';

const NOW = new Date('2026-10-01T09:00:00.000Z');

export const ELDER_A_ID = '12121212-1212-4121-8121-121212121212';
export const ELDER_B_ID = '13131313-1313-4131-8131-131313131313';
export const ELDER_CONTACT_A_ID = '14141414-1414-4141-8141-141414141414';

export function fakeElderContact(
  overrides: Partial<ElderContact> = {}
): ElderContact {
  return {
    id: ELDER_CONTACT_A_ID,
    createdAt: NOW,
    updatedAt: NOW,
    elderId: ELDER_A_ID,
    cityId: CITY_A_ID,
    name: 'Contact 1',
    relation: 'child',
    phone: '+972500000001',
    isPrimary: true,
    ...overrides,
  };
}

export function fakeElder(
  overrides: Partial<Elder> & { contacts?: ElderContact[] } = {}
): Elder & { contacts: ElderContact[] } {
  const { contacts, ...elderOverrides } = overrides;
  const id = elderOverrides.id ?? ELDER_A_ID;

  return {
    id,
    createdAt: NOW,
    updatedAt: NOW,
    archivedAt: null,
    cityId: CITY_A_ID,
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
    ...elderOverrides,
    contacts: contacts ?? [
      fakeElderContact({
        elderId: id,
        cityId: elderOverrides.cityId ?? CITY_A_ID,
      }),
    ],
  };
}

export function createElderPayload(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    fullName: 'Elder A',
    street: '1 Test Street',
    houseNumber: '1',
    contacts: [
      {
        name: 'Contact 1',
        relation: 'child',
        phone: '+972500000001',
        isPrimary: true,
      },
    ],
    ...overrides,
  };
}
