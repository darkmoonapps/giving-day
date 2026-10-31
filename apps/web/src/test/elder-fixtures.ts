import type { ElderResponseDto } from '../api/generated/api';
import {
  createAuthFetchMock,
  mockEmptyResponse,
  mockJsonResponse,
  type AuthFetchStub,
} from './auth-fixtures';
import { CITY_A_ID, coordinatorUser } from './distribution-day-fixtures';

export const ELDER_RIVKAH_ID = '12121212-1212-4121-8121-121212121212';
export const ELDER_YOSEF_ID = '13131313-1313-4131-8131-131313131313';
export const ELDER_MIRIAM_ID = '19191919-1919-4191-8191-191919191919';
export const CONTACT_TAMAR_ID = '14141414-1414-4141-8141-141414141414';
export const CREATED_ELDER_ID = '20202020-2020-4020-8020-202020202020';

export const elderRivkah: ElderResponseDto = {
  id: ELDER_RIVKAH_ID,
  cityId: CITY_A_ID,
  fullName: 'Rivkah Levi',
  phone: '+972500000010',
  phoneAlt: null,
  language: 'he',
  street: '12 Example St',
  houseNumber: '12',
  entrance: 'B',
  floor: '3',
  apartment: '7',
  buildingCode: '1234',
  addressNotes: 'Knock loudly',
  lat: null,
  lng: null,
  geocodeStatus: 'pending',
  status: 'active',
  statusReason: null,
  notes: 'Entrance is around the back',
  archivedAt: null,
  createdAt: '2026-10-01T09:00:00.000Z',
  updatedAt: '2026-10-01T09:00:00.000Z',
  contacts: [
    {
      id: CONTACT_TAMAR_ID,
      name: 'Tamar Levi',
      relation: 'child',
      phone: '+972506666666',
      isPrimary: true,
    },
  ],
};

export const elderYosefPaused: ElderResponseDto = {
  id: ELDER_YOSEF_ID,
  cityId: CITY_A_ID,
  fullName: 'Yosef Abraham',
  phone: '+972500000011',
  phoneAlt: null,
  language: 'he',
  street: '4 Park Ave',
  houseNumber: '4',
  entrance: null,
  floor: null,
  apartment: null,
  buildingCode: null,
  addressNotes: null,
  lat: null,
  lng: null,
  geocodeStatus: 'pending',
  status: 'paused',
  statusReason: 'Hospital stay',
  notes: null,
  archivedAt: null,
  createdAt: '2026-10-01T09:00:00.000Z',
  updatedAt: '2026-10-01T09:00:00.000Z',
  contacts: [],
};

export const elderMiriamArchived: ElderResponseDto = {
  id: ELDER_MIRIAM_ID,
  cityId: CITY_A_ID,
  fullName: 'Miriam Cohen',
  phone: '+972500000012',
  phoneAlt: null,
  language: 'he',
  street: '8 Weizmann St',
  houseNumber: '8',
  entrance: null,
  floor: null,
  apartment: null,
  buildingCode: null,
  addressNotes: null,
  lat: null,
  lng: null,
  geocodeStatus: 'pending',
  status: 'removed',
  statusReason: null,
  notes: null,
  archivedAt: '2026-10-15T09:00:00.000Z',
  createdAt: '2026-10-01T09:00:00.000Z',
  updatedAt: '2026-10-15T09:00:00.000Z',
  contacts: [],
};

export interface ElderFetchStub extends AuthFetchStub {
  elders?: ElderResponseDto[];
  createStatus?: number;
  updateStatus?: number;
  deactivateStatus?: number;
}

function listQuery(url: string): { status: string | null; archived: boolean } {
  const query = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
  const params = new URLSearchParams(query);
  return {
    status: params.get('status'),
    archived: params.get('includeArchived') === 'true',
  };
}

function isEldersCollectionUrl(url: string): boolean {
  return /\/api\/cities\/[^/]+\/elders(?:\?|$)/.test(url);
}

function isElderItemUrl(url: string): boolean {
  return /\/api\/cities\/[^/]+\/elders\/[^/]+$/.test(url);
}

function isDeactivateUrl(url: string): boolean {
  return /\/api\/cities\/[^/]+\/elders\/[^/]+\/deactivate$/.test(url);
}

export function createElderFetchMock(
  options: ElderFetchStub = {}
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  const authMock = createAuthFetchMock({
    refresh: options.refresh ?? 'ok',
    user: options.user ?? coordinatorUser(),
    logout: options.logout,
  });
  let elders = [...(options.elders ?? [elderRivkah])];

  return async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (method === 'POST' && isDeactivateUrl(url)) {
      if (
        options.deactivateStatus !== undefined &&
        options.deactivateStatus >= 400
      ) {
        return mockEmptyResponse(options.deactivateStatus);
      }
      const elderId = url.split('/elders/')[1]?.replace(/\/deactivate$/, '');
      const existing = elders.find((elder) => elder.id === elderId);
      if (existing === undefined) {
        return mockEmptyResponse(404);
      }
      const deactivated = {
        ...existing,
        status: 'removed' as const,
        archivedAt: '2026-10-31T09:00:00.000Z',
      };
      elders = elders.map((elder) =>
        elder.id === deactivated.id ? deactivated : elder
      );
      return mockJsonResponse(deactivated);
    }

    if (method === 'PATCH' && isElderItemUrl(url)) {
      if (options.updateStatus !== undefined && options.updateStatus >= 400) {
        return mockEmptyResponse(options.updateStatus);
      }
      const elderId = url.split('/elders/')[1];
      const existing = elders.find((elder) => elder.id === elderId);
      if (existing === undefined) {
        return mockEmptyResponse(404);
      }
      const body =
        typeof init?.body === 'string'
          ? (JSON.parse(init.body) as Record<string, unknown>)
          : {};
      const updated: ElderResponseDto = {
        ...existing,
        ...body,
        contacts: Array.isArray(body.contacts)
          ? (body.contacts as ElderResponseDto['contacts']).map(
              (contact, index) => ({
                id: existing.contacts[index]?.id ?? CONTACT_TAMAR_ID,
                name: contact.name,
                relation: contact.relation,
                phone: contact.phone,
                isPrimary: contact.isPrimary,
              })
            )
          : existing.contacts,
      };
      elders = elders.map((elder) =>
        elder.id === updated.id ? updated : elder
      );
      return mockJsonResponse(updated);
    }

    if (method === 'POST' && isEldersCollectionUrl(url)) {
      if (options.createStatus !== undefined && options.createStatus >= 400) {
        return mockEmptyResponse(options.createStatus);
      }
      const body =
        typeof init?.body === 'string'
          ? (JSON.parse(init.body) as Record<string, unknown>)
          : {};
      const created: ElderResponseDto = {
        ...elderRivkah,
        id: CREATED_ELDER_ID,
        fullName:
          typeof body.fullName === 'string' ? body.fullName : 'New Elder',
        phone: typeof body.phone === 'string' ? body.phone : null,
        street: typeof body.street === 'string' ? body.street : '1 Test Street',
        houseNumber:
          typeof body.houseNumber === 'string' ? body.houseNumber : '1',
        notes: typeof body.notes === 'string' ? body.notes : null,
        status: 'active',
        archivedAt: null,
        contacts: Array.isArray(body.contacts)
          ? (body.contacts as ElderResponseDto['contacts']).map((contact) => ({
              id: CONTACT_TAMAR_ID,
              name: contact.name,
              relation: contact.relation,
              phone: contact.phone,
              isPrimary: contact.isPrimary,
            }))
          : [],
      };
      elders = [...elders, created];
      return mockJsonResponse(created, 201);
    }

    if (method === 'GET' && isEldersCollectionUrl(url)) {
      const query = listQuery(url);
      const visible = elders.filter((elder) => {
        if (!query.archived && elder.archivedAt !== null) {
          return false;
        }
        if (query.status !== null && elder.status !== query.status) {
          return false;
        }
        return true;
      });
      return mockJsonResponse({ elders: visible });
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
