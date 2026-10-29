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
}

export function createDayFetchMock(
  options: DayFetchStub = {}
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  const authMock = createAuthFetchMock(options);
  let currentDay = options.day ?? openDay;

  return async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const url = String(input);
    const method = init?.method ?? 'GET';

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

    return authMock(input, init);
  };
}
