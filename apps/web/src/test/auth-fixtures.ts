import type { AuthUser } from '@giving-day/shared';

export const FAKE_ACCESS_TOKEN = 'test-access-token';

export const FAKE_USER_ID = '11111111-1111-4111-8111-111111111111';

export function fakeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: FAKE_USER_ID,
    firstName: 'Noa',
    lastName: 'Cohen',
    phone: '+972501234567',
    email: 'noa.cohen@example.test',
    birthDate: '1990-03-15',
    locale: 'he',
    onboardedAt: null,
    ...overrides,
  };
}

export function mockJsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

export function mockEmptyResponse(status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => undefined,
  } as Response;
}

export interface AuthFetchStub {
  refresh?: 'ok' | 'unauthorized' | 'error';
  user?: AuthUser | null;
  onboardingUser?: AuthUser | 'error';
  logout?: 'ok' | 'error';
}

export function createAuthFetchMock(
  options: AuthFetchStub = {}
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  const refresh = options.refresh ?? 'unauthorized';

  return async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const url = String(input);

    if (url.includes('/api/auth/refresh')) {
      if (refresh === 'unauthorized') {
        return mockEmptyResponse(401);
      }
      if (refresh === 'error') {
        return mockEmptyResponse(500);
      }
      return mockJsonResponse({ accessToken: FAKE_ACCESS_TOKEN });
    }

    if (url.includes('/api/auth/me')) {
      if (options.user === undefined || options.user === null) {
        return mockEmptyResponse(401);
      }
      return mockJsonResponse({ user: options.user });
    }

    if (url.includes('/api/auth/onboarding')) {
      if (options.onboardingUser === 'error') {
        return mockEmptyResponse(400);
      }
      const body =
        typeof init?.body === 'string'
          ? (JSON.parse(init.body) as Record<string, unknown>)
          : {};
      const baseUser = options.user ?? fakeUser();
      const onboarded =
        options.onboardingUser ??
        fakeUser({
          ...baseUser,
          ...body,
          onboardedAt: '2026-10-28T08:00:00.000Z',
        });
      return mockJsonResponse({ user: onboarded });
    }

    if (url.includes('/api/auth/logout')) {
      if (options.logout === 'error') {
        return mockEmptyResponse(500);
      }
      return mockEmptyResponse(204);
    }

    return mockEmptyResponse(404);
  };
}
