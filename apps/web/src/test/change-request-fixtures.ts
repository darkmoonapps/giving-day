import type { ElderChangeRequestResponseDto } from '../api/generated/api';
import {
  createAuthFetchMock,
  mockEmptyResponse,
  mockJsonResponse,
  type AuthFetchStub,
} from './auth-fixtures';
import {
  CITY_A_ID,
  ELDER_RIVKAH,
  ELDER_YOSEF,
  coordinatorUser,
} from './distribution-day-fixtures';
import { CONTACT_TAMAR_ID } from './elder-fixtures';

export const CHANGE_REQUEST_RIVKAH_ID = '21212121-2121-4212-8212-212121212121';
export const CHANGE_REQUEST_YOSEF_ID = '23232323-2323-4232-8232-232323232323';
export const VOLUNTEER_YONATAN_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

export function pendingRivkahChangeRequest(
  overrides: Partial<ElderChangeRequestResponseDto> = {}
): ElderChangeRequestResponseDto {
  return {
    id: CHANGE_REQUEST_RIVKAH_ID,
    cityId: CITY_A_ID,
    elderId: ELDER_RIVKAH.id,
    requestedById: VOLUNTEER_YONATAN_ID,
    changes: {
      street: { from: '12 Example St', to: '18 Weizmann St' },
      notes: {
        from: 'Entrance is around the back',
        to: 'Ring the Holon courtyard bell',
      },
    },
    reason: 'Moved within Holon',
    status: 'pending',
    reviewedById: null,
    reviewedAt: null,
    reviewNote: null,
    createdAt: '2026-10-30T09:00:00.000Z',
    updatedAt: '2026-10-30T09:00:00.000Z',
    elder: {
      id: ELDER_RIVKAH.id,
      fullName: ELDER_RIVKAH.fullName,
      street: ELDER_RIVKAH.street,
      houseNumber: ELDER_RIVKAH.houseNumber,
      entrance: ELDER_RIVKAH.entrance,
      floor: ELDER_RIVKAH.floor,
      apartment: ELDER_RIVKAH.apartment,
      addressNotes: ELDER_RIVKAH.addressNotes,
      notes: ELDER_RIVKAH.notes,
      contacts: ELDER_RIVKAH.contacts.map((contact) => ({
        id: CONTACT_TAMAR_ID,
        name: contact.name,
        relation: contact.relation,
        phone: contact.phone,
        isPrimary: contact.isPrimary,
      })),
    },
    requestedBy: {
      id: VOLUNTEER_YONATAN_ID,
      firstName: 'Yonatan',
      lastName: 'Bar',
    },
    ...overrides,
  };
}

export function pendingYosefChangeRequest(
  overrides: Partial<ElderChangeRequestResponseDto> = {}
): ElderChangeRequestResponseDto {
  return {
    id: CHANGE_REQUEST_YOSEF_ID,
    cityId: CITY_A_ID,
    elderId: ELDER_YOSEF.id,
    requestedById: VOLUNTEER_YONATAN_ID,
    changes: {
      contacts: {
        from: [],
        to: [
          {
            name: 'Dana Abraham',
            relation: 'child',
            phone: '+972507777777',
            isPrimary: true,
          },
        ],
      },
    },
    reason: 'New Holon next of kin',
    status: 'pending',
    reviewedById: null,
    reviewedAt: null,
    reviewNote: null,
    createdAt: '2026-10-30T10:00:00.000Z',
    updatedAt: '2026-10-30T10:00:00.000Z',
    elder: {
      id: ELDER_YOSEF.id,
      fullName: ELDER_YOSEF.fullName,
      street: ELDER_YOSEF.street,
      houseNumber: ELDER_YOSEF.houseNumber,
      entrance: ELDER_YOSEF.entrance,
      floor: ELDER_YOSEF.floor,
      apartment: ELDER_YOSEF.apartment,
      addressNotes: ELDER_YOSEF.addressNotes,
      notes: ELDER_YOSEF.notes,
      contacts: [],
    },
    requestedBy: {
      id: VOLUNTEER_YONATAN_ID,
      firstName: 'Yonatan',
      lastName: 'Bar',
    },
    ...overrides,
  };
}

export interface ChangeRequestFetchStub extends AuthFetchStub {
  changeRequests?: ElderChangeRequestResponseDto[];
  listStatus?: number;
  createStatus?: number;
  approveStatus?: number;
  rejectStatus?: number;
}

function isCollectionUrl(url: string): boolean {
  return /\/api\/cities\/[^/]+\/elder-change-requests(?:\?|$)/.test(url);
}

function isApproveUrl(url: string): boolean {
  return /\/api\/cities\/[^/]+\/elder-change-requests\/[^/]+\/approve$/.test(
    url
  );
}

function isRejectUrl(url: string): boolean {
  return /\/api\/cities\/[^/]+\/elder-change-requests\/[^/]+\/reject$/.test(
    url
  );
}

function requestIdFromUrl(url: string): string {
  const match = /\/elder-change-requests\/([^/?]+)/.exec(url);
  return match?.[1] ?? CHANGE_REQUEST_RIVKAH_ID;
}

export function createChangeRequestFetchMock(
  options: ChangeRequestFetchStub = {}
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  const authMock = createAuthFetchMock({
    refresh: options.refresh ?? 'ok',
    user: options.user ?? coordinatorUser(),
    logout: options.logout,
  });
  let changeRequests = [
    ...(options.changeRequests ?? [
      pendingRivkahChangeRequest(),
      pendingYosefChangeRequest(),
    ]),
  ];

  return async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (method === 'POST' && isApproveUrl(url)) {
      if (options.approveStatus !== undefined && options.approveStatus >= 400) {
        return mockEmptyResponse(options.approveStatus);
      }
      const requestId = requestIdFromUrl(url);
      const current =
        changeRequests.find((request) => request.id === requestId) ??
        pendingRivkahChangeRequest();
      changeRequests = changeRequests.filter(
        (request) => request.id !== requestId
      );
      return mockJsonResponse({
        ...current,
        status: 'approved',
        reviewedAt: '2026-10-31T12:00:00.000Z',
      });
    }

    if (method === 'POST' && isRejectUrl(url)) {
      if (options.rejectStatus !== undefined && options.rejectStatus >= 400) {
        return mockEmptyResponse(options.rejectStatus);
      }
      const requestId = requestIdFromUrl(url);
      const current =
        changeRequests.find((request) => request.id === requestId) ??
        pendingYosefChangeRequest();
      const body =
        typeof init?.body === 'string'
          ? (JSON.parse(init.body) as Record<string, unknown>)
          : {};
      changeRequests = changeRequests.filter(
        (request) => request.id !== requestId
      );
      return mockJsonResponse({
        ...current,
        status: 'rejected',
        reviewNote:
          typeof body.reviewNote === 'string' ? body.reviewNote : null,
        reviewedAt: '2026-10-31T12:05:00.000Z',
      });
    }

    if (method === 'POST' && isCollectionUrl(url)) {
      if (options.createStatus !== undefined && options.createStatus >= 400) {
        return mockEmptyResponse(options.createStatus);
      }
      const body =
        typeof init?.body === 'string'
          ? (JSON.parse(init.body) as Record<string, unknown>)
          : {};
      const created = pendingRivkahChangeRequest({
        elderId:
          typeof body.elderId === 'string' ? body.elderId : ELDER_RIVKAH.id,
        reason: typeof body.reason === 'string' ? body.reason : null,
      });
      changeRequests = [
        created,
        ...changeRequests.filter(
          (request) => request.elderId !== created.elderId
        ),
      ];
      return mockJsonResponse(created, 201);
    }

    if (method === 'GET' && isCollectionUrl(url)) {
      if (options.listStatus !== undefined && options.listStatus >= 400) {
        return mockEmptyResponse(options.listStatus);
      }
      return mockJsonResponse({ changeRequests });
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
