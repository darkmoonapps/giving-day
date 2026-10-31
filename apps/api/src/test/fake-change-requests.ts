import type {
  Elder,
  ElderChangeRequest,
  ElderContact,
  User,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { CITY_A_ID, VOLUNTEER_A_ID } from './fake-users';
import { ELDER_A_ID, fakeElder } from './fake-elders';

const NOW = new Date('2026-10-31T09:00:00.000Z');

export const CHANGE_REQUEST_A_ID = '17171717-1717-4171-8171-171717171717';

export function fakeChangeRequestChanges(): Prisma.JsonObject {
  return {
    street: { from: '1 Test Street', to: '4 Park Ave' },
    notes: { from: null, to: 'Entrance is on the side' },
  };
}

export function fakeChangeRequest(
  overrides: Partial<ElderChangeRequest> & {
    elder?: Elder & { contacts: ElderContact[] };
    requestedBy?: Pick<User, 'id' | 'firstName' | 'lastName'>;
  } = {}
): ElderChangeRequest & {
  elder: Elder & { contacts: ElderContact[] };
  requestedBy: Pick<User, 'id' | 'firstName' | 'lastName'>;
} {
  const { elder, requestedBy, ...requestOverrides } = overrides;
  const elderId = requestOverrides.elderId ?? ELDER_A_ID;
  const requestedById = requestOverrides.requestedById ?? VOLUNTEER_A_ID;

  return {
    id: CHANGE_REQUEST_A_ID,
    createdAt: NOW,
    updatedAt: NOW,
    cityId: CITY_A_ID,
    elderId,
    requestedById,
    changes: fakeChangeRequestChanges(),
    reason: 'Moved within Holon',
    status: 'pending',
    reviewedById: null,
    reviewedAt: null,
    reviewNote: null,
    ...requestOverrides,
    elder: elder ?? fakeElder({ id: elderId }),
    requestedBy: requestedBy ?? {
      id: requestedById,
      firstName: 'Yonatan',
      lastName: 'Bar',
    },
  };
}

export function createChangeRequestPayload(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    elderId: ELDER_A_ID,
    changes: {
      street: '4 Park Ave',
      notes: 'Entrance is on the side',
    },
    reason: 'Moved within Holon',
    ...overrides,
  };
}
