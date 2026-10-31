import type { CitySettingsResponseDto } from '../api/generated/api';
import {
  createAuthFetchMock,
  mockEmptyResponse,
  mockJsonResponse,
  type AuthFetchStub,
} from './auth-fixtures';
import {
  CITY_A_ID,
  coordinatorUser,
  openDay,
} from './distribution-day-fixtures';

export const holonCitySettings: CitySettingsResponseDto = {
  cityId: CITY_A_ID,
  centerAddress: '10 Warehouse Rd, Holon',
  centerLat: 32.0114,
  centerLng: 34.7748,
  defaultStartTime: '09:00:00',
  defaultEndTime: '14:00:00',
  confirmReminderAfterHours: 24,
  unpickedPushMinutesBeforeEnd: 60,
  missingFinalStatusWaitHours: 72,
  defaultLocale: 'he',
  defaultTheme: 'wisteria-mint',
  orgName: 'Latet Holon',
  logoUrl: null,
  extra: { mapZoom: 14 },
};

export interface CitySettingsFetchStub extends AuthFetchStub {
  settings?: CitySettingsResponseDto;
  getStatus?: number;
  updateStatus?: number;
}

export function createCitySettingsFetchMock(
  options: CitySettingsFetchStub = {}
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  const authMock = createAuthFetchMock({
    refresh: options.refresh ?? 'ok',
    user: options.user ?? coordinatorUser(),
    logout: options.logout,
  });
  let settings = options.settings ?? holonCitySettings;

  return async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (
      method === 'PATCH' &&
      url.includes(`/api/cities/${CITY_A_ID}/settings`)
    ) {
      if (options.updateStatus !== undefined && options.updateStatus >= 400) {
        return mockEmptyResponse(options.updateStatus);
      }
      const body =
        typeof init?.body === 'string'
          ? (JSON.parse(init.body) as Partial<CitySettingsResponseDto>)
          : {};
      settings = {
        ...settings,
        ...body,
        extra: settings.extra,
      };
      return mockJsonResponse(settings);
    }

    if (method === 'GET' && url.includes(`/api/cities/${CITY_A_ID}/settings`)) {
      if (options.getStatus !== undefined && options.getStatus >= 400) {
        return mockEmptyResponse(options.getStatus);
      }
      return mockJsonResponse(settings);
    }

    if (
      method === 'GET' &&
      /\/api\/cities\/[^/]+\/distribution-days$/.test(url.replace(/\?.*$/, ''))
    ) {
      return mockJsonResponse({ days: [openDay] });
    }

    return authMock(input, init);
  };
}
