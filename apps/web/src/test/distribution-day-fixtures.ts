import type { AuthUser } from '@giving-day/shared';
import {
  createAuthFetchMock,
  fakeUser,
  mockJsonResponse,
  type AuthFetchStub,
} from './auth-fixtures';

export const CITY_A_ID = '11111111-1111-4111-8111-111111111111';
export const DAY_ID = '33333333-3333-4333-8333-333333333333';

export function volunteerUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return fakeUser({
    onboardedAt: '2026-10-28T08:00:00.000Z',
    memberships: [
      {
        cityId: CITY_A_ID,
        role: 'volunteer',
        status: 'active',
      },
    ],
    ...overrides,
  });
}

export function coordinatorUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return fakeUser({
    firstName: 'Noa',
    lastName: 'Levi',
    onboardedAt: '2026-10-28T08:00:00.000Z',
    memberships: [
      {
        cityId: CITY_A_ID,
        role: 'coordinator',
        status: 'active',
      },
    ],
    ...overrides,
  });
}

export const openDay = {
  id: DAY_ID,
  cityId: CITY_A_ID,
  date: '2026-11-15',
  startTime: '09:00:00',
  endTime: '14:00:00',
  notesForVolunteers: 'Bring a folding cart',
  addOns: ['holiday honey'],
  status: 'published' as const,
  publishedAt: '2026-10-28T09:00:00.000Z',
  closedAt: null,
  myParticipation: null,
};

export const ELDER_RIVKAH = {
  id: '12121212-1212-4121-8121-121212121212',
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

export const DELIVERY_RIVKAH_ID = '16161616-1616-4161-8161-161616161616';

export const volunteerDeliveryRivkah = {
  id: DELIVERY_RIVKAH_ID,
  cityId: CITY_A_ID,
  dayId: DAY_ID,
  status: 'assigned' as const,
  note: null,
  notDeliveredReason: null,
  elder: ELDER_RIVKAH,
};

export const ELDER_YOSEF = {
  id: '13131313-1313-4131-8131-131313131313',
  fullName: 'Yosef Abraham',
  street: '4 Park Ave',
  houseNumber: '4',
  entrance: null,
  floor: null,
  apartment: null,
  addressNotes: null,
  notes: null,
  contacts: [],
};

export const DELIVERY_YOSEF_ID = '17171717-1717-4171-8171-171717171717';

export const volunteerDeliveryYosef = {
  id: DELIVERY_YOSEF_ID,
  cityId: CITY_A_ID,
  dayId: DAY_ID,
  status: 'assigned' as const,
  note: null,
  notDeliveredReason: null,
  elder: ELDER_YOSEF,
};

export const coordinatorDeliveryRivkah = {
  ...volunteerDeliveryRivkah,
  volunteerId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  matchId: '14141414-1414-4141-8141-141414141414',
  assignedAt: '2026-10-28T09:00:00.000Z',
  volunteer: {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    firstName: 'Yonatan',
    lastName: 'Bar',
  },
};

export const coordinatorDeliveryNotDelivered = {
  ...coordinatorDeliveryRivkah,
  status: 'not_delivered' as const,
  note: 'Elder was not home in Holon',
  notDeliveredReason: 'not_home' as const,
};

export const coordinatorDeliveryUnassigned = {
  id: '17171717-1717-4171-8171-171717171717',
  cityId: CITY_A_ID,
  dayId: DAY_ID,
  status: 'unassigned' as const,
  volunteerId: null,
  matchId: '15151515-1515-4151-8151-151515151515',
  assignedAt: null,
  volunteer: null,
  elder: {
    id: '13131313-1313-4131-8131-131313131313',
    fullName: 'Yosef Abraham',
    street: '4 Park Ave',
    houseNumber: '4',
    entrance: null,
    floor: null,
    apartment: null,
    addressNotes: null,
    notes: null,
    contacts: [],
  },
  replacementSuggestions: [
    {
      id: '99999999-9999-4999-8999-999999999999',
      firstName: 'Dana',
      lastName: 'Levi',
      homeArea: 'Park',
    },
    {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      firstName: 'Yonatan',
      lastName: 'Bar',
      homeArea: 'Neve Erez',
    },
  ],
};

export const coordinatorDeliveryUnmatched = {
  ...coordinatorDeliveryUnassigned,
  id: '18181818-1818-4181-8181-181818181818',
  matchId: null,
  elder: {
    id: '19191919-1919-4191-8191-191919191919',
    fullName: 'Miriam Cohen',
    street: '8 Weizmann St',
    houseNumber: '8',
    entrance: null,
    floor: null,
    apartment: null,
    addressNotes: null,
    notes: null,
    contacts: [],
  },
  replacementSuggestions: [
    {
      id: '99999999-9999-4999-8999-999999999999',
      firstName: 'Dana',
      lastName: 'Levi',
      homeArea: 'Weizmann',
    },
    {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      firstName: 'Yonatan',
      lastName: 'Bar',
      homeArea: 'Neve Erez',
    },
  ],
};

export interface DayFetchStub extends AuthFetchStub {
  day?: typeof openDay;
  listDays?: Array<typeof openDay>;
  responses?: Array<{
    volunteerId: string;
    firstName: string | null;
    lastName: string | null;
    responseStatus: 'confirmed' | 'declined' | 'no_response';
    cancelReason: string | null;
    respondedAt: string | null;
  }>;
  respond?:
    ((body: Record<string, unknown>) => Record<string, unknown>) | 'error';
  volunteerDeliveries?: Array<
    Omit<typeof volunteerDeliveryRivkah, 'status'> & {
      status: 'assigned' | 'picked' | 'delivered' | 'not_delivered';
    }
  >;
  coordinatorDeliveries?: Array<
    | typeof coordinatorDeliveryRivkah
    | typeof coordinatorDeliveryNotDelivered
    | typeof coordinatorDeliveryUnassigned
    | typeof coordinatorDeliveryUnmatched
  >;
  assignableVolunteers?: Array<{
    id: string;
    firstName: string | null;
    lastName: string | null;
  }>;
  assign?:
    ((body: Record<string, unknown>) => Record<string, unknown>) | 'error';
  updateStatus?:
    ((body: Record<string, unknown>) => Record<string, unknown>) | 'error';
  changeRequests?: unknown[];
  createChangeRequest?:
    ((body: Record<string, unknown>) => Record<string, unknown>) | 'error';
}

export function createDayFetchMock(
  options: DayFetchStub = {}
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  const authMock = createAuthFetchMock(options);
  let currentDay = options.day ?? openDay;
  let volunteerRows = options.volunteerDeliveries ?? [volunteerDeliveryRivkah];

  return async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (
      method === 'PATCH' &&
      url.includes(
        `/api/cities/${CITY_A_ID}/distribution-days/${DAY_ID}/deliveries/`
      ) &&
      url.includes('/status')
    ) {
      if (options.updateStatus === 'error') {
        return mockJsonResponse({ message: 'error' }, 500);
      }
      const body =
        typeof init?.body === 'string'
          ? (JSON.parse(init.body) as Record<string, unknown>)
          : {};
      if (typeof options.updateStatus === 'function') {
        return mockJsonResponse(options.updateStatus(body));
      }
      const nextStatus =
        body.status === 'picked' ||
        body.status === 'delivered' ||
        body.status === 'not_delivered' ||
        body.status === 'assigned'
          ? body.status
          : 'assigned';
      volunteerRows = volunteerRows.map((row) =>
        url.includes(row.id)
          ? {
              ...row,
              status: nextStatus,
              note: typeof body.note === 'string' ? body.note : row.note,
              notDeliveredReason:
                typeof body.notDeliveredReason === 'string'
                  ? body.notDeliveredReason
                  : row.notDeliveredReason,
            }
          : row
      );
      return mockJsonResponse(
        volunteerRows.find((row) => url.includes(row.id)) ?? {
          ...volunteerDeliveryRivkah,
          status: nextStatus,
        }
      );
    }

    if (
      method === 'PATCH' &&
      url.includes(
        `/api/cities/${CITY_A_ID}/distribution-days/${DAY_ID}/deliveries/`
      )
    ) {
      if (options.assign === 'error') {
        return mockJsonResponse({ message: 'error' }, 500);
      }
      const body =
        typeof init?.body === 'string'
          ? (JSON.parse(init.body) as Record<string, unknown>)
          : {};
      if (typeof options.assign === 'function') {
        return mockJsonResponse(options.assign(body));
      }
      return mockJsonResponse({
        ...coordinatorDeliveryRivkah,
        volunteerId: body.volunteerId ?? null,
        status: body.volunteerId === null ? 'unassigned' : 'assigned',
      });
    }

    if (
      method === 'GET' &&
      url.includes(
        `/api/cities/${CITY_A_ID}/distribution-days/${DAY_ID}/deliveries`
      )
    ) {
      if (options.coordinatorDeliveries !== undefined) {
        return mockJsonResponse({
          dayId: DAY_ID,
          cityId: CITY_A_ID,
          unassignedCount: options.coordinatorDeliveries.filter(
            (delivery) => delivery.volunteerId === null
          ).length,
          assignableVolunteers: options.assignableVolunteers ?? [
            {
              id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
              firstName: 'Yonatan',
              lastName: 'Bar',
            },
            {
              id: '99999999-9999-4999-8999-999999999999',
              firstName: 'Dana',
              lastName: 'Levi',
            },
          ],
          deliveries: options.coordinatorDeliveries,
        });
      }
      return mockJsonResponse({
        dayId: DAY_ID,
        cityId: CITY_A_ID,
        deliveries: volunteerRows,
      });
    }

    if (
      method === 'POST' &&
      url.includes(
        `/api/cities/${CITY_A_ID}/distribution-days/${DAY_ID}/participations`
      )
    ) {
      if (options.respond === 'error') {
        return mockJsonResponse({ message: 'error' }, 500);
      }
      const body =
        typeof init?.body === 'string'
          ? (JSON.parse(init.body) as Record<string, unknown>)
          : {};
      const participation =
        options.respond === undefined
          ? {
              id: '44444444-4444-4444-8444-444444444444',
              cityId: CITY_A_ID,
              dayId: DAY_ID,
              volunteerId: volunteerUser().id,
              status: body.status,
              respondedAt: '2026-10-29T10:00:00.000Z',
              cancelReason:
                typeof body.cancelReason === 'string'
                  ? body.cancelReason
                  : null,
            }
          : options.respond(body);
      currentDay = {
        ...currentDay,
        myParticipation: participation as typeof currentDay.myParticipation,
      };
      return mockJsonResponse(participation);
    }

    if (
      method === 'GET' &&
      url.includes(
        `/api/cities/${CITY_A_ID}/distribution-days/${DAY_ID}/participations`
      )
    ) {
      return mockJsonResponse({
        dayId: DAY_ID,
        cityId: CITY_A_ID,
        responses: options.responses ?? [],
      });
    }

    if (
      method === 'GET' &&
      url.includes(`/api/cities/${CITY_A_ID}/distribution-days/${DAY_ID}`)
    ) {
      return mockJsonResponse(currentDay);
    }

    if (
      method === 'GET' &&
      /\/api\/cities\/[^/]+\/distribution-days$/.test(url.replace(/\?.*$/, ''))
    ) {
      return mockJsonResponse({
        days: options.listDays ?? [currentDay],
      });
    }

    if (url.includes('/elder-change-requests')) {
      if (
        method === 'POST' &&
        !url.includes('/approve') &&
        !url.includes('/reject')
      ) {
        if (options.createChangeRequest === 'error') {
          return mockJsonResponse({ message: 'error' }, 500);
        }
        const body =
          typeof init?.body === 'string'
            ? (JSON.parse(init.body) as Record<string, unknown>)
            : {};
        if (typeof options.createChangeRequest === 'function') {
          return mockJsonResponse(options.createChangeRequest(body), 201);
        }
        return mockJsonResponse(
          {
            id: '21212121-2121-4212-8212-212121212121',
            cityId: CITY_A_ID,
            elderId:
              typeof body.elderId === 'string' ? body.elderId : ELDER_RIVKAH.id,
            requestedById: volunteerUser().id,
            changes: body.changes ?? {
              street: { from: '12 Example St', to: '18 Weizmann St' },
            },
            reason: typeof body.reason === 'string' ? body.reason : null,
            status: 'pending',
            reviewedById: null,
            reviewedAt: null,
            reviewNote: null,
            createdAt: '2026-10-31T09:00:00.000Z',
            updatedAt: '2026-10-31T09:00:00.000Z',
            elder: {
              ...ELDER_RIVKAH,
              contacts: ELDER_RIVKAH.contacts.map((contact) => ({
                id: '14141414-1414-4141-8141-141414141414',
                ...contact,
              })),
            },
            requestedBy: {
              id: volunteerUser().id,
              firstName: 'Noa',
              lastName: 'Cohen',
            },
          },
          201
        );
      }
      if (method === 'GET') {
        return mockJsonResponse({
          changeRequests: options.changeRequests ?? [],
        });
      }
    }

    return authMock(input, init);
  };
}
