import type {
  AuthUser,
  JoinLinkPreview,
  RedeemJoinLinkResponse,
} from '@giving-day/shared';
import {
  createAuthFetchMock,
  fakeUser,
  mockEmptyResponse,
  mockJsonResponse,
  type AuthFetchStub,
} from './auth-fixtures';

export const FAKE_JOIN_TOKEN = 'fake-join-token';

export const HOLON_CITY_ID = '11111111-1111-4111-8111-111111111111';

export const holonJoinPreview: JoinLinkPreview = {
  cityId: HOLON_CITY_ID,
  citySlug: 'holon',
  cityNameHe: 'חולון',
  cityNameEn: 'Holon',
  role: 'volunteer',
};

export function holonRedeemResponse(
  result: RedeemJoinLinkResponse['result']
): RedeemJoinLinkResponse {
  return {
    result,
    membership: {
      membershipId: '99999999-9999-4999-8999-999999999999',
      cityId: HOLON_CITY_ID,
      citySlug: 'holon',
      cityNameHe: 'חולון',
      cityNameEn: 'Holon',
      role: 'volunteer',
      status: result === 'already_active' ? 'active' : 'pending',
    },
  };
}

export function onboardedJoinUser(): AuthUser {
  return fakeUser({ onboardedAt: '2026-10-28T08:00:00.000Z' });
}

export interface JoinFetchStub {
  auth?: AuthFetchStub;
  preview?: JoinLinkPreview | 'not_found' | 'error';
  redeem?: RedeemJoinLinkResponse | 'invalid' | 'paused' | 'error';
}

export function createJoinFetchMock(
  options: JoinFetchStub = {}
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  const authMock = createAuthFetchMock(options.auth);

  return async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();

    if (url.includes('/api/join/') && method === 'GET') {
      if (options.preview === 'not_found') {
        return mockJsonResponse(
          { statusCode: 404, message: 'cities.invalid_join_token' },
          404
        );
      }
      if (options.preview === 'error') {
        return mockEmptyResponse(500);
      }
      return mockJsonResponse(options.preview ?? holonJoinPreview);
    }

    if (
      (url.endsWith('/api/join') || url.includes('/api/join?')) &&
      method === 'POST'
    ) {
      if (options.redeem === 'invalid') {
        return mockJsonResponse(
          { statusCode: 404, message: 'cities.invalid_join_token' },
          404
        );
      }
      if (options.redeem === 'paused') {
        return mockJsonResponse(
          { statusCode: 409, message: 'cities.membership_paused' },
          409
        );
      }
      if (options.redeem === 'error') {
        return mockEmptyResponse(500);
      }
      return mockJsonResponse(options.redeem ?? holonRedeemResponse('pending'));
    }

    return authMock(input, init);
  };
}
