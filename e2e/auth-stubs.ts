import type { Page, Route } from '@playwright/test';

const FAKE_USER_ID = '11111111-1111-4111-8111-111111111111';

export interface StubMembership {
  cityId: string;
  role: 'volunteer' | 'coordinator';
  status: 'pending' | 'active' | 'paused' | 'removed';
}

export interface StubUserOptions {
  onboarded: boolean;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
  birthDate?: string | null;
  memberships?: StubMembership[];
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
    memberships: options.memberships ?? [],
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

const CITY_A_ID = '11111111-1111-4111-8111-111111111111';
const DAY_ID = '33333333-3333-4333-8333-333333333333';

export interface StubDayResponse {
  volunteerId: string;
  firstName: string | null;
  lastName: string | null;
  responseStatus: 'confirmed' | 'declined' | 'no_response';
  cancelReason: string | null;
  respondedAt: string | null;
}

export async function stubDistributionDayApi(
  page: Page,
  options: {
    onRespond?: (body: Record<string, unknown>) => void;
    responses?: StubDayResponse[];
  } = {}
): Promise<void> {
  const openDay = {
    id: DAY_ID,
    cityId: CITY_A_ID,
    date: '2026-11-15',
    startTime: '09:00:00',
    endTime: '14:00:00',
    notesForVolunteers: 'Bring a folding cart',
    addOns: ['holiday honey'],
    status: 'published',
    publishedAt: '2026-10-28T09:00:00.000Z',
    closedAt: null,
    myParticipation: null as Record<string, unknown> | null,
  };

  await page.route('**/api/cities/*/distribution-days/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (method === 'POST' && url.pathname.endsWith('/participations')) {
      const raw = request.postData();
      const body =
        raw === null || raw.length === 0
          ? {}
          : (JSON.parse(raw) as Record<string, unknown>);
      if (options.onRespond !== undefined) {
        options.onRespond(body);
      }
      const participation = {
        id: '44444444-4444-4444-8444-444444444444',
        cityId: CITY_A_ID,
        dayId: DAY_ID,
        volunteerId: FAKE_USER_ID,
        status: body.status,
        respondedAt: '2026-10-29T10:00:00.000Z',
        cancelReason:
          typeof body.cancelReason === 'string' ? body.cancelReason : null,
      };
      openDay.myParticipation = participation;
      await jsonFulfill(route, participation);
      return;
    }

    if (method === 'GET' && url.pathname.endsWith('/participations')) {
      await jsonFulfill(route, {
        dayId: DAY_ID,
        cityId: CITY_A_ID,
        responses: options.responses ?? [],
      });
      return;
    }

    if (method === 'GET') {
      await jsonFulfill(route, openDay);
    }
  });

  await page.route('**/api/cities/*/distribution-days', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await jsonFulfill(route, { days: [openDay] });
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
