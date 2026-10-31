import {
  createAuthFetchMock,
  mockEmptyResponse,
  mockJsonResponse,
  type AuthFetchStub,
} from './auth-fixtures';
import { CITY_A_ID, coordinatorUser } from './distribution-day-fixtures';

export const MATCH_RIVKAH_ID = '15151515-1515-4151-8151-151515151515';
export const ELDER_RIVKAH_ID = '12121212-1212-4121-8121-121212121212';
export const ELDER_YOSEF_ID = '13131313-1313-4131-8131-131313131313';
export const VOLUNTEER_YONATAN_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
export const VOLUNTEER_DANA_ID = '99999999-9999-4999-8999-999999999999';

export const currentMatchRivkah = {
  id: MATCH_RIVKAH_ID,
  cityId: CITY_A_ID,
  elderId: ELDER_RIVKAH_ID,
  volunteerId: VOLUNTEER_YONATAN_ID,
  type: 'permanent' as const,
  startsAt: '2026-10-01',
  endsAt: null,
  endReason: null,
  createdAt: '2026-10-01T09:00:00.000Z',
  updatedAt: '2026-10-01T09:00:00.000Z',
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

export const unmatchedYosef = {
  id: ELDER_YOSEF_ID,
  fullName: 'Yosef Abraham',
  status: 'active' as const,
};

export const volunteerDana = {
  id: VOLUNTEER_DANA_ID,
  firstName: 'Dana',
  lastName: 'Levi',
};

export interface MatchFetchStub extends AuthFetchStub {
  matches?: (typeof currentMatchRivkah)[];
  unmatchedElders?: (typeof unmatchedYosef)[];
  matchableVolunteers?: Array<{
    id: string;
    firstName: string | null;
    lastName: string | null;
  }>;
  createStatus?: number;
  endStatus?: number;
}

export function createMatchFetchMock(
  options: MatchFetchStub = {}
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  const authMock = createAuthFetchMock({
    refresh: options.refresh ?? 'ok',
    user: options.user ?? coordinatorUser(),
    logout: options.logout,
  });
  let matches = [...(options.matches ?? [currentMatchRivkah])];
  let unmatchedElders = [...(options.unmatchedElders ?? [unmatchedYosef])];

  return async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (
      method === 'POST' &&
      /\/api\/cities\/[^/]+\/matches\/[^/]+\/end/.test(url)
    ) {
      if (options.endStatus !== undefined && options.endStatus >= 400) {
        return mockEmptyResponse(options.endStatus);
      }
      const body =
        typeof init?.body === 'string'
          ? (JSON.parse(init.body) as Record<string, unknown>)
          : {};
      const ended = {
        ...currentMatchRivkah,
        endsAt: '2026-10-31',
        endReason:
          typeof body.endReason === 'string' ? body.endReason : 'reassigned',
      };
      matches = matches.filter((match) => match.id !== MATCH_RIVKAH_ID);
      unmatchedElders = [...unmatchedElders, currentMatchRivkah.elder];
      return mockJsonResponse(ended);
    }

    if (method === 'POST' && /\/api\/cities\/[^/]+\/matches$/.test(url)) {
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
        ...currentMatchRivkah,
        id: '16161616-1616-4161-8161-161616161616',
        elderId: ELDER_YOSEF_ID,
        volunteerId:
          typeof body.volunteerId === 'string'
            ? body.volunteerId
            : VOLUNTEER_DANA_ID,
        elder: unmatchedYosef,
        volunteer: volunteerDana,
      };
      matches = [...matches, created];
      unmatchedElders = unmatchedElders.filter(
        (elder) => elder.id !== ELDER_YOSEF_ID
      );
      return mockJsonResponse(created, 201);
    }

    if (method === 'GET' && /\/api\/cities\/[^/]+\/matches$/.test(url)) {
      return mockJsonResponse({
        matches,
        unmatchedElders,
        matchableVolunteers: options.matchableVolunteers ?? [
          currentMatchRivkah.volunteer,
          volunteerDana,
        ],
      });
    }

    return authMock(input, init);
  };
}
