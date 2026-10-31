import type {
  CityResponseDto,
  CitySettingsResponseDto,
} from '../api/generated/api';
import {
  createAuthFetchMock,
  mockEmptyResponse,
  mockJsonResponse,
  type AuthFetchStub,
} from './auth-fixtures';
import { superAdminUser } from './distribution-day-fixtures';

export const EXAMPLE_CITY_ID = '22222222-2222-4222-8222-222222222222';

export const exampleCity: CityResponseDto = {
  id: EXAMPLE_CITY_ID,
  slug: 'example-city',
  nameHe: 'עיר דוגמה',
  nameEn: 'Example City',
  timezone: 'Asia/Jerusalem',
  isActive: true,
};

export const exampleCitySettings: CitySettingsResponseDto = {
  cityId: EXAMPLE_CITY_ID,
  centerAddress: '-',
  centerLat: 0,
  centerLng: 0,
  defaultStartTime: '09:00:00',
  defaultEndTime: '14:00:00',
  confirmReminderAfterHours: 24,
  unpickedPushMinutesBeforeEnd: 60,
  missingFinalStatusWaitHours: 72,
  defaultLocale: 'he',
  defaultTheme: 'wisteria-mint',
  orgName: null,
  logoUrl: null,
  extra: {},
};

export interface CreateCityFetchStub extends AuthFetchStub {
  created?: CityResponseDto;
  createStatus?: number;
  createCode?: string;
}

export function createCityFetchMock(
  options: CreateCityFetchStub = {}
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  const authMock = createAuthFetchMock({
    refresh: options.refresh ?? 'ok',
    user: options.user ?? superAdminUser(),
    logout: options.logout,
  });

  return async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (
      method === 'POST' &&
      /\/api\/cities\/?$/.test(url.replace(/\?.*$/, ''))
    ) {
      if (options.createStatus !== undefined && options.createStatus >= 400) {
        if (options.createCode !== undefined) {
          return mockJsonResponse(
            { statusCode: options.createStatus, message: options.createCode },
            options.createStatus
          );
        }
        return mockEmptyResponse(options.createStatus);
      }
      return mockJsonResponse(options.created ?? exampleCity, 201);
    }

    if (
      method === 'GET' &&
      url.includes(`/api/cities/${EXAMPLE_CITY_ID}/settings`)
    ) {
      return mockJsonResponse(exampleCitySettings);
    }

    if (
      method === 'GET' &&
      url.includes(`/api/cities/${EXAMPLE_CITY_ID}/join-links`)
    ) {
      return mockJsonResponse({
        links: [
          {
            role: 'coordinator',
            active: false,
            createdAt: null,
            usedCount: 0,
          },
          {
            role: 'volunteer',
            active: false,
            createdAt: null,
            usedCount: 0,
          },
        ],
      });
    }

    return authMock(input, init);
  };
}
