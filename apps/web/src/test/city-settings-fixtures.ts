import {
  TEMPLATE_KEYS,
  defaultMessageCopyFor,
  placeholdersFor,
} from '@giving-day/shared';
import type {
  CityJoinLinkCreatedDto,
  CityJoinLinksResponseDto,
  CitySettingsResponseDto,
  MessageTemplateResponseDto,
  MessageTemplatesResponseDto,
} from '../api/generated/api';
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

function defaultHolonTemplates(): MessageTemplateResponseDto[] {
  const templates: MessageTemplateResponseDto[] = [];
  for (const key of TEMPLATE_KEYS) {
    for (const locale of ['he', 'en'] as const) {
      const copy = defaultMessageCopyFor(key, locale);
      templates.push({
        id: null,
        key,
        locale,
        title: copy.title,
        body: copy.body,
        defaultTitle: copy.title,
        defaultBody: copy.body,
        isCustom: false,
        placeholders: [...placeholdersFor(key)],
      });
    }
  }
  return templates;
}

export const holonMessageTemplates: MessageTemplatesResponseDto = {
  templates: defaultHolonTemplates(),
};

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

export const holonJoinLinks: CityJoinLinksResponseDto = {
  links: [
    {
      role: 'coordinator',
      active: false,
      createdAt: null,
      usedCount: 0,
    },
    {
      role: 'volunteer',
      active: true,
      createdAt: '2026-10-01T09:00:00.000Z',
      usedCount: 2,
    },
  ],
};

export const holonVolunteerJoinLinkCreated: CityJoinLinkCreatedDto = {
  role: 'volunteer',
  token: 'fake-holon-volunteer-token',
  url: 'http://localhost:3000/join/fake-holon-volunteer-token',
  createdAt: '2026-10-31T12:00:00.000Z',
  usedCount: 0,
};

export const holonCoordinatorJoinLinkCreated: CityJoinLinkCreatedDto = {
  role: 'coordinator',
  token: 'fake-holon-coordinator-token',
  url: 'http://localhost:3000/join/fake-holon-coordinator-token',
  createdAt: '2026-10-31T12:05:00.000Z',
  usedCount: 0,
};

export interface CitySettingsFetchStub extends AuthFetchStub {
  settings?: CitySettingsResponseDto;
  joinLinks?: CityJoinLinksResponseDto;
  messageTemplates?: MessageTemplatesResponseDto;
  regenerated?: Partial<
    Record<'volunteer' | 'coordinator', CityJoinLinkCreatedDto>
  >;
  getStatus?: number;
  updateStatus?: number;
  joinLinksStatus?: number;
  regenerateStatus?: number;
  messageTemplatesStatus?: number;
  upsertTemplateStatus?: number;
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
  let joinLinks = options.joinLinks ?? holonJoinLinks;
  let messageTemplates = options.messageTemplates ?? {
    templates: holonMessageTemplates.templates.map((template) => ({
      ...template,
    })),
  };

  return async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url.includes(`/api/cities/${CITY_A_ID}/message-templates`)) {
      if (
        method === 'PUT' &&
        /\/message-templates\/[^/]+\/(he|en)$/.test(url)
      ) {
        if (
          options.upsertTemplateStatus !== undefined &&
          options.upsertTemplateStatus >= 400
        ) {
          return mockEmptyResponse(options.upsertTemplateStatus);
        }
        const match = /\/message-templates\/([^/]+)\/(he|en)$/.exec(url);
        const key = match?.[1] ?? 'day_invite';
        const locale = (match?.[2] ?? 'he') as 'he' | 'en';
        const body =
          typeof init?.body === 'string'
            ? (JSON.parse(init.body) as { title?: string; body?: string })
            : {};
        const next: MessageTemplateResponseDto = {
          id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
          key: key as MessageTemplateResponseDto['key'],
          locale,
          title: body.title ?? '',
          body: body.body ?? '',
          defaultTitle:
            messageTemplates.templates.find(
              (template) => template.key === key && template.locale === locale
            )?.defaultTitle ??
            body.title ??
            '',
          defaultBody:
            messageTemplates.templates.find(
              (template) => template.key === key && template.locale === locale
            )?.defaultBody ??
            body.body ??
            '',
          isCustom: true,
          placeholders:
            messageTemplates.templates.find(
              (template) => template.key === key && template.locale === locale
            )?.placeholders ?? [],
        };
        messageTemplates = {
          templates: messageTemplates.templates.map((template) =>
            template.key === key && template.locale === locale ? next : template
          ),
        };
        return mockJsonResponse(next);
      }

      if (
        method === 'DELETE' &&
        /\/message-templates\/[^/]+\/(he|en)$/.test(url)
      ) {
        const match = /\/message-templates\/([^/]+)\/(he|en)$/.exec(url);
        const key = match?.[1] ?? 'day_invite';
        const locale = (match?.[2] ?? 'he') as 'he' | 'en';
        const current = messageTemplates.templates.find(
          (template) => template.key === key && template.locale === locale
        );
        const reset: MessageTemplateResponseDto = {
          id: null,
          key: key as MessageTemplateResponseDto['key'],
          locale,
          title: current?.defaultTitle ?? '',
          body: current?.defaultBody ?? '',
          defaultTitle: current?.defaultTitle ?? '',
          defaultBody: current?.defaultBody ?? '',
          isCustom: false,
          placeholders: current?.placeholders ?? [],
        };
        messageTemplates = {
          templates: messageTemplates.templates.map((template) =>
            template.key === key && template.locale === locale
              ? reset
              : template
          ),
        };
        return mockJsonResponse(reset);
      }

      if (method === 'GET') {
        if (
          options.messageTemplatesStatus !== undefined &&
          options.messageTemplatesStatus >= 400
        ) {
          return mockEmptyResponse(options.messageTemplatesStatus);
        }
        return mockJsonResponse(messageTemplates);
      }
    }

    if (
      method === 'POST' &&
      url.includes(`/api/cities/${CITY_A_ID}/join-links/`)
    ) {
      if (
        options.regenerateStatus !== undefined &&
        options.regenerateStatus >= 400
      ) {
        return mockEmptyResponse(options.regenerateStatus);
      }
      const role: 'volunteer' | 'coordinator' = url.includes(
        '/coordinator/regenerate'
      )
        ? 'coordinator'
        : 'volunteer';
      const created =
        options.regenerated?.[role] ??
        (role === 'coordinator'
          ? holonCoordinatorJoinLinkCreated
          : holonVolunteerJoinLinkCreated);
      joinLinks = {
        links: joinLinks.links.map((link) =>
          link.role === role
            ? {
                role,
                active: true,
                createdAt: created.createdAt,
                usedCount: created.usedCount,
              }
            : link
        ),
      };
      return mockJsonResponse(created, 201);
    }

    if (
      method === 'GET' &&
      url.includes(`/api/cities/${CITY_A_ID}/join-links`)
    ) {
      if (
        options.joinLinksStatus !== undefined &&
        options.joinLinksStatus >= 400
      ) {
        return mockEmptyResponse(options.joinLinksStatus);
      }
      return mockJsonResponse(joinLinks);
    }

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
