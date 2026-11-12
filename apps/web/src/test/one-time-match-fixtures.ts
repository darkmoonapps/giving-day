import {
  createAuthFetchMock,
  mockEmptyResponse,
  mockJsonResponse,
  type AuthFetchStub,
} from './auth-fixtures';
import {
  CITY_A_ID,
  DAY_ID,
  coordinatorUser,
  publishedDay,
} from './distribution-day-fixtures';
import {
  ELDER_RIVKAH_ID,
  ELDER_YOSEF_ID,
  VOLUNTEER_DANA_ID,
  VOLUNTEER_YONATAN_ID,
  unmatchedYosef,
  volunteerDana,
} from './match-fixtures';

export const ONE_TIME_MATCH_RIVKAH_ID = '16161616-1616-4161-8161-161616161616';

export const oneTimeMatchRivkah = {
  id: ONE_TIME_MATCH_RIVKAH_ID,
  cityId: CITY_A_ID,
  elderId: ELDER_RIVKAH_ID,
  volunteerId: VOLUNTEER_YONATAN_ID,
  type: 'one_time' as const,
  dayId: DAY_ID,
  startsAt: '2026-11-12',
  endsAt: null,
  endReason: null,
  createdAt: '2026-11-01T09:00:00.000Z',
  updatedAt: '2026-11-01T09:00:00.000Z',
  elder: {
    id: ELDER_RIVKAH_ID,
    fullName: 'Rivkah Levi',
    status: 'active' as const,
  },
  volunteer: {
    id: VOLUNTEER_YONATAN_ID,
    firstName: 'Yonatan',
    lastName: 'Bar',
  },
};

export interface OneTimeMatchFetchStub extends AuthFetchStub {
  matches?: (typeof oneTimeMatchRivkah)[];
  availableElders?: (typeof unmatchedYosef)[];
  matchableVolunteers?: Array<{
    id: string;
    firstName: string | null;
    lastName: string | null;
  }>;
  createStatus?: number;
  endStatus?: number;
}

export function createOneTimeMatchFetchMock(
  options: OneTimeMatchFetchStub = {}
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  const authMock = createAuthFetchMock({
    refresh: options.refresh ?? 'ok',
    user: options.user ?? coordinatorUser(),
    logout: options.logout,
  });
  let matches = [...(options.matches ?? [oneTimeMatchRivkah])];
  let availableElders = [...(options.availableElders ?? [unmatchedYosef])];

  return async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const oneTimeBase = `/api/cities/${CITY_A_ID}/distribution-days/${DAY_ID}/one-time-matches`;

    if (
      method === 'POST' &&
      url.includes(`${oneTimeBase}/`) &&
      url.includes('/end')
    ) {
      if (options.endStatus !== undefined && options.endStatus >= 400) {
        return mockEmptyResponse(options.endStatus);
      }
      const body =
        typeof init?.body === 'string'
          ? (JSON.parse(init.body) as Record<string, unknown>)
          : {};
      const ended = {
        ...oneTimeMatchRivkah,
        endsAt: '2026-11-12',
        endReason:
          typeof body.endReason === 'string' ? body.endReason : 'reassigned',
      };
      matches = matches.filter(
        (match) => match.id !== ONE_TIME_MATCH_RIVKAH_ID
      );
      availableElders = [...availableElders, oneTimeMatchRivkah.elder];
      return mockJsonResponse(ended);
    }

    if (method === 'POST' && url.includes(oneTimeBase)) {
      if (options.createStatus === 409) {
        return mockEmptyResponse(409);
      }
      if (options.createStatus !== undefined && options.createStatus >= 400) {
        return mockEmptyResponse(options.createStatus);
      }
      const body =
        typeof init?.body === 'string'
          ? (JSON.parse(init.body) as Record<string, unknown>)
          : {};
      const created = {
        ...oneTimeMatchRivkah,
        id: '17171717-1717-4171-8171-171717171717',
        elderId: ELDER_YOSEF_ID,
        volunteerId:
          typeof body.volunteerId === 'string'
            ? body.volunteerId
            : VOLUNTEER_DANA_ID,
        elder: unmatchedYosef,
        volunteer: volunteerDana,
      };
      matches = [...matches, created];
      availableElders = availableElders.filter(
        (elder) => elder.id !== ELDER_YOSEF_ID
      );
      return mockJsonResponse(created, 201);
    }

    if (method === 'GET' && url.includes(oneTimeBase)) {
      return mockJsonResponse({
        matches,
        availableElders,
        matchableVolunteers: options.matchableVolunteers ?? [
          oneTimeMatchRivkah.volunteer,
          volunteerDana,
        ],
      });
    }

    if (
      method === 'GET' &&
      url.includes(`/api/cities/${CITY_A_ID}/distribution-days/${DAY_ID}`)
    ) {
      return mockJsonResponse({
        ...publishedDay,
        date: '2026-11-12',
      });
    }

    return authMock(input, init);
  };
}
