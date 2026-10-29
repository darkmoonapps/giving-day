import type { Page, Route } from '@playwright/test';

const FAKE_USER_ID = '11111111-1111-4111-8111-111111111111';

export interface StubUserOptions {
  onboarded: boolean;
}

function fakeUserPayload(options: StubUserOptions): Record<string, unknown> {
  return {
    id: FAKE_USER_ID,
    firstName: 'Noa',
    lastName: 'Cohen',
    phone: '+972501234567',
    email: 'noa.cohen@example.test',
    birthDate: '1990-03-15',
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
