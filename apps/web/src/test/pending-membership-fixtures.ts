import type { CityMembershipRecordDto } from '../api/generated/api';
import {
  createAuthFetchMock,
  mockEmptyResponse,
  mockJsonResponse,
  type AuthFetchStub,
} from './auth-fixtures';
import { coordinatorUser } from './distribution-day-fixtures';

export const MEMBERSHIP_TAMAR_ID = '99999999-9999-4999-8999-999999999999';
export const MEMBERSHIP_DANA_ID = '88888888-8888-4888-8888-888888888888';
export const USER_TAMAR_ID = '12121212-1212-4121-8121-121212121212';
export const USER_DANA_ID = '13131313-1313-4131-8131-131313131313';

export const pendingTamar: CityMembershipRecordDto = {
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
};

export const pendingDana: CityMembershipRecordDto = {
  membershipId: MEMBERSHIP_DANA_ID,
  userId: USER_DANA_ID,
  firstName: 'Dana',
  lastName: 'Cohen',
  email: 'dana.cohen@example.com',
  phone: '+972507777777',
  role: 'coordinator',
  status: 'pending',
  createdAt: '2026-10-29T11:30:00.000Z',
  approvedAt: null,
};

export interface PendingMembershipFetchStub extends AuthFetchStub {
  memberships?: CityMembershipRecordDto[];
  listStatus?: number;
  approveStatus?: number;
  rejectStatus?: number;
}

function isPendingListUrl(url: string): boolean {
  return /\/api\/cities\/[^/]+\/memberships\/pending(?:\?|$)/.test(url);
}

function membershipAction(
  url: string
): { membershipId: string; action: 'approve' | 'reject' } | null {
  const match =
    /\/api\/cities\/[^/]+\/memberships\/([^/]+)\/(approve|reject)(?:\?|$)/.exec(
      url
    );
  if (match === null || match[1] === undefined || match[2] === undefined) {
    return null;
  }
  return {
    membershipId: match[1],
    action: match[2] as 'approve' | 'reject',
  };
}

export function createPendingMembershipFetchMock(
  options: PendingMembershipFetchStub = {}
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  const authMock = createAuthFetchMock({
    refresh: options.refresh ?? 'ok',
    user: options.user ?? coordinatorUser(),
    logout: options.logout,
  });
  let memberships = [...(options.memberships ?? [pendingTamar, pendingDana])];

  return async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    const action = membershipAction(url);

    if (method === 'GET' && isPendingListUrl(url)) {
      if (options.listStatus !== undefined && options.listStatus >= 400) {
        return mockEmptyResponse(options.listStatus);
      }
      return mockJsonResponse({ memberships });
    }

    if (method === 'POST' && action !== null) {
      const status =
        action.action === 'approve'
          ? options.approveStatus
          : options.rejectStatus;
      if (status !== undefined && status >= 400) {
        return mockEmptyResponse(status);
      }

      const current = memberships.find(
        (membership) => membership.membershipId === action.membershipId
      );
      if (current === undefined) {
        return mockEmptyResponse(404);
      }

      const updated: CityMembershipRecordDto = {
        ...current,
        status: action.action === 'approve' ? 'active' : 'removed',
        approvedAt:
          action.action === 'approve' ? '2026-10-31T12:00:00.000Z' : null,
      };
      memberships = memberships.filter(
        (membership) => membership.membershipId !== action.membershipId
      );
      return mockJsonResponse(updated);
    }

    if (
      method === 'GET' &&
      /\/api\/cities\/[^/]+\/distribution-days(?:\?|$)/.test(url)
    ) {
      return mockJsonResponse({ days: [] });
    }

    return authMock(input, init);
  };
}
