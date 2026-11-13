import type { CityAuditLogsResponse } from '@giving-day/shared';
import {
  createAuthFetchMock,
  mockEmptyResponse,
  mockJsonResponse,
  type AuthFetchStub,
} from './auth-fixtures';
import { CITY_A_ID, coordinatorUser } from './distribution-day-fixtures';

export const AUDIT_ENTRY_NEWER_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
export const AUDIT_ENTRY_OLDER_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
export const AUDIT_MEMBERSHIP_ID = '99999999-9999-4999-8999-999999999999';
export const AUDIT_ACTOR_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export const AUDIT_USER_TAMAR_ID = '12121212-1212-4121-8121-121212121212';

export const holonAuditLogsPage1: CityAuditLogsResponse = {
  entries: [
    {
      id: AUDIT_ENTRY_NEWER_ID,
      cityId: CITY_A_ID,
      actorId: AUDIT_ACTOR_ID,
      action: 'membership.approve',
      entity: 'membership',
      entityId: AUDIT_MEMBERSHIP_ID,
      diff: { userId: AUDIT_USER_TAMAR_ID, role: 'volunteer' },
      at: '2026-11-13T10:00:00.000Z',
    },
    {
      id: AUDIT_ENTRY_OLDER_ID,
      cityId: CITY_A_ID,
      actorId: AUDIT_ACTOR_ID,
      action: 'delivery.assign',
      entity: 'delivery',
      entityId: '16161616-1616-4161-8161-161616161616',
      diff: {
        dayId: '33333333-3333-4333-8333-333333333333',
        fromVolunteerId: null,
        toVolunteerId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      },
      at: '2026-11-13T09:00:00.000Z',
    },
  ],
  page: 1,
  pageSize: 20,
  total: 2,
};

export interface AuditLogFetchStub extends AuthFetchStub {
  auditLogs?: CityAuditLogsResponse | 'error';
}

function isAuditLogsUrl(url: string): boolean {
  return /\/api\/cities\/[^/]+\/audit-logs\/?(\?.*)?$/.test(url);
}

export function createAuditLogFetchMock(
  options: AuditLogFetchStub = {}
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

    if (method === 'GET' && isAuditLogsUrl(url)) {
      if (options.auditLogs === 'error') {
        return mockEmptyResponse(500);
      }
      return mockJsonResponse(options.auditLogs ?? holonAuditLogsPage1);
    }

    return authMock(input, init);
  };
}
