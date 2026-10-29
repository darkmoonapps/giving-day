import type { Page, Route } from '@playwright/test';

const FAKE_USER_ID = '11111111-1111-4111-8111-111111111111';

export interface StubUserOptions {
  onboarded: boolean;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
  birthDate?: string | null;
}

function fakeUserPayload(options: StubUserOptions): Record<string, unknown> {
  return {
    id: FAKE_USER_ID,
    firstName: options.firstName === undefined ? 'Noa' : options.firstName,
    lastName: options.lastName === undefined ? 'Cohen' : options.lastName,
    phone: options.phone === undefined ? '+972501234567' : options.phone,
    email:
      options.email === undefined ? 'noa.cohen@example.test' : options.email,
    birthDate:
      options.birthDate === undefined ? '1990-03-15' : options.birthDate,
    locale: 'he',
    onboardedAt: options.onboarded ? '2026-10-28T08:00:00.000Z' : null,
  };
}

function jsonFulfill(route: Route, payload: unknown): Promise<void> {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  });
}

export async function stubAuthenticatedSession(
  page: Page,
  options: StubUserOptions
): Promise<void> {
  await page.route('**/api/auth/refresh', async (route) => {
    await jsonFulfill(route, { accessToken: 'e2e-access-token' });
  });

  await page.route('**/api/auth/me', async (route) => {
    await jsonFulfill(route, { user: fakeUserPayload(options) });
  });
}

export function isGoogleOAuthStartUrl(url: URL): boolean {
  const path = url.pathname.replace(/\/$/, '');
  return path === '/api/auth/google';
}

export async function stubOnboardingSubmit(
  page: Page,
  onSubmit?: (body: Record<string, unknown>) => void
): Promise<void> {
  await page.route('**/api/auth/onboarding', async (route) => {
    const raw = route.request().postData();
    const body =
      raw === null || raw.length === 0
        ? {}
        : (JSON.parse(raw) as Record<string, unknown>);
    if (onSubmit !== undefined) {
      onSubmit(body);
    }
    await jsonFulfill(route, {
      user: {
        id: FAKE_USER_ID,
        firstName: body.firstName ?? 'Noa',
        lastName: body.lastName ?? 'Cohen',
        phone: body.phone ?? '+972501234567',
        email: 'noa.cohen@example.test',
        birthDate: typeof body.birthDate === 'string' ? body.birthDate : null,
        locale: body.locale ?? 'he',
        onboardedAt: '2026-10-28T08:00:00.000Z',
      },
    });
  });
}

export async function stubGoogleOAuthRedirect(
  page: Page,
  redirectPath: '/auth/callback' | '/onboarding'
): Promise<void> {
  await page.route(isGoogleOAuthStartUrl, async (route) => {
    const origin = new URL(page.url()).origin;
    await route.fulfill({
      status: 302,
      headers: {
        location: `${origin}${redirectPath}`,
      },
    });
  });
}
