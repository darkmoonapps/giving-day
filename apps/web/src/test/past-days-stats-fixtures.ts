import type { CityPastDistributionDaysStats } from '@giving-day/shared';
import {
  createAuthFetchMock,
  mockEmptyResponse,
  mockJsonResponse,
  type AuthFetchStub,
} from './auth-fixtures';
import { CITY_A_ID, coordinatorUser } from './distribution-day-fixtures';

export const CLOSED_DAY_OCT_ID = '55555555-5555-4555-8555-555555555555';
export const CLOSED_DAY_SEP_ID = '66666666-6666-4666-8666-666666666666';

export const holonPastDaysStats: CityPastDistributionDaysStats = {
  cityId: CITY_A_ID,
  days: [
    {
      dayId: CLOSED_DAY_OCT_ID,
      date: '2026-10-15',
      status: 'closed',
      eldersServed: 2,
      packagesDelivered: 2,
      packagesNotDelivered: 1,
      packagesOpen: 0,
      volunteersConfirmed: 3,
      volunteersDeclined: 1,
    },
    {
      dayId: CLOSED_DAY_SEP_ID,
      date: '2026-09-15',
      status: 'closed',
      eldersServed: 1,
      packagesDelivered: 1,
      packagesNotDelivered: 0,
      packagesOpen: 1,
      volunteersConfirmed: 2,
      volunteersDeclined: 0,
    },
  ],
  totals: {
    days: 2,
    eldersServed: 3,
    packagesDelivered: 3,
    packagesNotDelivered: 1,
    packagesOpen: 1,
    volunteersConfirmed: 5,
    volunteersDeclined: 1,
  },
};

export interface PastDaysStatsFetchStub extends AuthFetchStub {
  stats?: CityPastDistributionDaysStats | 'error';
}

function isPastDaysStatsUrl(url: string): boolean {
  return /\/api\/cities\/[^/]+\/distribution-days\/stats\/?$/.test(url);
}

export function createPastDaysStatsFetchMock(
  options: PastDaysStatsFetchStub = {}
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  const authMock = createAuthFetchMock({
    refresh: options.refresh ?? 'ok',
    user: options.user ?? coordinatorUser(),
    ...options,
  });

  return async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (method === 'GET' && isPastDaysStatsUrl(url)) {
      if (options.stats === 'error') {
        return mockEmptyResponse(500);
      }
      return mockJsonResponse(options.stats ?? holonPastDaysStats);
    }

    return authMock(input, init);
  };
}
