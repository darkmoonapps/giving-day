import type { CityVolunteerListItem } from '@giving-day/shared';
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
  openDay,
} from './distribution-day-fixtures';

export const MEMBERSHIP_YONATAN_ID = '66666666-6666-4666-8666-666666666666';
export const MEMBERSHIP_DANA_ID = '77777777-7777-4777-8777-777777777777';
export const MEMBERSHIP_TAMAR_ID = '88888888-8888-4888-8888-888888888888';
export const USER_YONATAN_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
export const USER_DANA_ID = '99999999-9999-4999-8999-999999999999';
export const USER_TAMAR_ID = '12121212-1212-4121-8121-121212121212';

export const volunteerYonatan: CityVolunteerListItem = {
  membershipId: MEMBERSHIP_YONATAN_ID,
  userId: USER_YONATAN_ID,
  firstName: 'Yonatan',
  lastName: 'Bar',
  email: 'yonatan.bar@example.com',
  phone: '+972502222222',
  role: 'volunteer',
  status: 'active',
  createdAt: '2026-10-01T09:00:00.000Z',
  approvedAt: '2026-10-01T09:00:00.000Z',
  homeArea: 'North',
  dayResponseStatus: null,
  cancelReason: null,
};

export const volunteerDana: CityVolunteerListItem = {
  membershipId: MEMBERSHIP_DANA_ID,
  userId: USER_DANA_ID,
  firstName: 'Dana',
  lastName: 'Levi',
  email: 'dana.levi@example.com',
  phone: '+972505555555',
  role: 'volunteer',
  status: 'active',
  createdAt: '2026-10-02T09:00:00.000Z',
  approvedAt: '2026-10-02T09:00:00.000Z',
  homeArea: 'South',
  dayResponseStatus: null,
  cancelReason: null,
};

export const volunteerTamarPending: CityVolunteerListItem = {
  membershipId: MEMBERSHIP_TAMAR_ID,
  userId: USER_TAMAR_ID,
  firstName: 'Tamar',
  lastName: 'Shalev',
  email: 'tamar.shalev@example.com',
  phone: '+972506666666',
  role: 'volunteer',
  status: 'pending',
  createdAt: '2026-10-28T09:00:00.000Z',
  approvedAt: null,
  homeArea: null,
  dayResponseStatus: null,
  cancelReason: null,
};

export interface VolunteerListFetchStub extends AuthFetchStub {
  volunteers?: CityVolunteerListItem[];
  listStatus?: number;
}

function isVolunteersUrl(url: string): boolean {
  return /\/api\/cities\/[^/]+\/volunteers(?:\?|$)/.test(url);
}

function matchesFilters(
  volunteer: CityVolunteerListItem,
  params: URLSearchParams
): boolean {
  const status = params.get('status');
  if (status !== null && volunteer.status !== status) {
    return false;
  }

  const search = params.get('search')?.trim().toLowerCase();
  if (search !== undefined && search.length > 0) {
    const haystack = [
      volunteer.firstName,
      volunteer.lastName,
      volunteer.phone,
      volunteer.email,
    ]
      .filter((value): value is string => value !== null)
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(search)) {
      return false;
    }
  }

  const dayId = params.get('dayId');
  const dayResponse = params.get('dayResponse');
  if (dayId === DAY_ID) {
    if (dayResponse !== null && volunteer.dayResponseStatus !== dayResponse) {
      return false;
    }
  }

  return true;
}

function withDayResponse(
  volunteer: CityVolunteerListItem,
  dayId: string | null
): CityVolunteerListItem {
  if (dayId !== DAY_ID) {
    return {
      ...volunteer,
      dayResponseStatus: null,
      cancelReason: null,
    };
  }

  if (volunteer.membershipId === MEMBERSHIP_YONATAN_ID) {
    return {
      ...volunteer,
      dayResponseStatus: 'confirmed',
      cancelReason: null,
    };
  }
  if (volunteer.membershipId === MEMBERSHIP_DANA_ID) {
    return {
      ...volunteer,
      dayResponseStatus: 'declined',
      cancelReason: 'Out of town',
    };
  }
  return {
    ...volunteer,
    dayResponseStatus: 'no_response',
    cancelReason: null,
  };
}

export function createVolunteerListFetchMock(
  options: VolunteerListFetchStub = {}
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  const authMock = createAuthFetchMock({
    refresh: options.refresh ?? 'ok',
    user: options.user ?? coordinatorUser(),
    logout: options.logout,
  });
  const volunteers = [
    ...(options.volunteers ?? [
      volunteerYonatan,
      volunteerDana,
      volunteerTamarPending,
    ]),
  ];

  return async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();

    if (method === 'GET' && isVolunteersUrl(url)) {
      if (options.listStatus !== undefined && options.listStatus >= 400) {
        return mockEmptyResponse(options.listStatus);
      }

      const queryIndex = url.indexOf('?');
      const params = new URLSearchParams(
        queryIndex >= 0 ? url.slice(queryIndex + 1) : ''
      );
      const dayId = params.get('dayId');
      const filtered = volunteers
        .map((volunteer) => withDayResponse(volunteer, dayId))
        .filter((volunteer) => matchesFilters(volunteer, params));

      return mockJsonResponse({ volunteers: filtered });
    }

    if (
      method === 'GET' &&
      /\/api\/cities\/[^/]+\/distribution-days(?:\?|$)/.test(url)
    ) {
      return mockJsonResponse({
        days: [{ ...openDay, cityId: CITY_A_ID }],
      });
    }

    return authMock(input, init);
  };
}
