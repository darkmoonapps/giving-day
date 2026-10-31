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

export interface StubDeliveryElder {
  id: string;
  fullName: string;
  street: string;
  houseNumber: string;
  entrance: string | null;
  floor: string | null;
  apartment: string | null;
  addressNotes: string | null;
  notes: string | null;
  contacts: Array<{
    name: string;
    relation:
      | 'child'
      | 'spouse'
      | 'sibling'
      | 'caregiver'
      | 'social_worker'
      | 'neighbor'
      | 'other';
    phone: string;
    isPrimary: boolean;
  }>;
}

export interface StubCoordinatorDelivery {
  id: string;
  cityId: string;
  dayId: string;
  status: 'unassigned' | 'assigned' | 'picked' | 'delivered' | 'not_delivered';
  note?: string | null;
  notDeliveredReason?: string | null;
  volunteerId: string | null;
  matchId: string | null;
  assignedAt: string | null;
  volunteer: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  elder: StubDeliveryElder;
}

export async function stubDistributionDayApi(
  page: Page,
  options: {
    onRespond?: (body: Record<string, unknown>) => void;
    responses?: StubDayResponse[];
    coordinatorDeliveries?: StubCoordinatorDelivery[];
    volunteerDeliveries?: Array<{
      id: string;
      cityId: string;
      dayId: string;
      status: 'assigned' | 'picked' | 'delivered' | 'not_delivered';
      note?: string | null;
      notDeliveredReason?: string | null;
      elder: StubDeliveryElder;
    }>;
    onAssign?: (body: Record<string, unknown>) => void;
    onUpdateStatus?: (body: Record<string, unknown>) => void;
    cityNameHe?: string;
    cityNameEn?: string;
    centerAddress?: string;
    dashboard?: {
      dayId: string;
      cityId: string;
      date: string;
      startTime: string;
      endTime: string;
      status: string;
      volunteers: {
        total: number;
        confirmed: number;
        pending: number;
        declined: number;
      };
      deliveries: {
        unassigned: number;
        assigned: number;
        picked: number;
        delivered: number;
        notDelivered: number;
        cancelled: number;
      };
      unassignedElders: Array<{ elderId: string; fullName: string }>;
    };
    myParticipation?: Record<string, unknown> | null;
    assignableVolunteers?: Array<{
      id: string;
      firstName: string | null;
      lastName: string | null;
    }>;
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
    myParticipation:
      options.myParticipation === undefined ? null : options.myParticipation,
  };
  const volunteerDeliveries = [...(options.volunteerDeliveries ?? [])];

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

    if (method === 'GET' && url.pathname.endsWith('/dashboard')) {
      await jsonFulfill(
        route,
        options.dashboard ?? {
          dayId: DAY_ID,
          cityId: CITY_A_ID,
          date: '2026-11-15',
          startTime: '09:00:00',
          endTime: '14:00:00',
          status: 'published',
          volunteers: {
            total: 3,
            confirmed: 1,
            pending: 1,
            declined: 1,
          },
          deliveries: {
            unassigned: 1,
            assigned: 1,
            picked: 1,
            delivered: 1,
            notDelivered: 1,
            cancelled: 0,
          },
          unassignedElders: [
            {
              elderId: '13131313-1313-4131-8131-131313131313',
              fullName: 'Yosef Abraham',
            },
          ],
        }
      );
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

    if (method === 'PATCH' && url.pathname.endsWith('/status')) {
      const raw = request.postData();
      const body =
        raw === null || raw.length === 0
          ? {}
          : (JSON.parse(raw) as Record<string, unknown>);
      if (options.onUpdateStatus !== undefined) {
        options.onUpdateStatus(body);
      }
      const segments = url.pathname.split('/');
      const statusIndex = segments.lastIndexOf('status');
      const deliveryId =
        statusIndex > 0 ? segments[statusIndex - 1] : undefined;
      const current =
        volunteerDeliveries.find((row) => row.id === deliveryId) ??
        volunteerDeliveries[0];
      if (current !== undefined && typeof body.status === 'string') {
        if (
          body.status === 'assigned' ||
          body.status === 'picked' ||
          body.status === 'delivered' ||
          body.status === 'not_delivered'
        ) {
          current.status = body.status;
        }
        current.note = typeof body.note === 'string' ? body.note : current.note;
        current.notDeliveredReason =
          typeof body.notDeliveredReason === 'string'
            ? body.notDeliveredReason
            : current.notDeliveredReason;
      }
      await jsonFulfill(route, {
        ...(current ?? {
          id: '16161616-1616-4161-8161-161616161616',
          cityId: CITY_A_ID,
          dayId: DAY_ID,
          elder: {
            id: '12121212-1212-4121-8121-121212121212',
            fullName: 'Rivkah Levi',
            street: '12 Example St',
            houseNumber: '12',
            entrance: 'B',
            floor: '3',
            apartment: '7',
            addressNotes: 'Knock loudly',
            notes: 'Entrance is around the back',
            contacts: [],
          },
        }),
        status: body.status ?? 'picked',
        note: typeof body.note === 'string' ? body.note : null,
        notDeliveredReason:
          typeof body.notDeliveredReason === 'string'
            ? body.notDeliveredReason
            : null,
      });
      return;
    }

    if (method === 'PATCH' && url.pathname.includes('/deliveries/')) {
      const raw = request.postData();
      const body =
        raw === null || raw.length === 0
          ? {}
          : (JSON.parse(raw) as Record<string, unknown>);
      if (options.onAssign !== undefined) {
        options.onAssign(body);
      }
      await jsonFulfill(route, {
        id: '16161616-1616-4161-8161-161616161616',
        cityId: CITY_A_ID,
        dayId: DAY_ID,
        status: body.volunteerId === null ? 'unassigned' : 'assigned',
        note: null,
        notDeliveredReason: null,
        volunteerId: body.volunteerId ?? null,
        matchId: '14141414-1414-4141-8141-141414141414',
        assignedAt:
          body.volunteerId === null ? null : '2026-10-29T12:00:00.000Z',
        volunteer: null,
        elder: {
          id: '12121212-1212-4121-8121-121212121212',
          fullName: 'Rivkah Levi',
          street: '12 Example St',
          houseNumber: '12',
          entrance: 'B',
          floor: '3',
          apartment: '7',
          addressNotes: 'Knock loudly',
          notes: 'Entrance is around the back',
          contacts: [
            {
              name: 'Tamar Levi',
              relation: 'child',
              phone: '+972506666666',
              isPrimary: true,
            },
          ],
        },
      });
      return;
    }

    if (method === 'GET' && url.pathname.endsWith('/deliveries')) {
      const navigation = {
        cityNameHe: options.cityNameHe ?? 'חולון',
        cityNameEn: options.cityNameEn ?? 'Holon',
        centerAddress: options.centerAddress ?? '10 Warehouse Rd, Holon',
      };
      if (options.coordinatorDeliveries !== undefined) {
        await jsonFulfill(route, {
          dayId: DAY_ID,
          cityId: CITY_A_ID,
          ...navigation,
          unassignedCount: options.coordinatorDeliveries.filter(
            (delivery) => delivery.volunteerId === null
          ).length,
          assignableVolunteers: options.assignableVolunteers ?? [
            {
              id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
              firstName: 'Yonatan',
              lastName: 'Bar',
            },
            {
              id: '99999999-9999-4999-8999-999999999999',
              firstName: 'Dana',
              lastName: 'Levi',
            },
          ],
          deliveries: options.coordinatorDeliveries,
        });
        return;
      }
      await jsonFulfill(route, {
        dayId: DAY_ID,
        cityId: CITY_A_ID,
        ...navigation,
        deliveries: volunteerDeliveries,
      });
      return;
    }

    if (method === 'GET') {
      await jsonFulfill(route, openDay);
    }
  });

  await page.route('**/api/cities/*/elder-change-requests**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await jsonFulfill(route, { changeRequests: [] });
  });

  await page.route('**/api/cities/*/distribution-days', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await jsonFulfill(route, { days: [openDay] });
  });
}

export async function stubJoinLinkApi(
  page: Page,
  options: {
    preview?: Record<string, unknown> | 'not_found';
    redeem?: Record<string, unknown> | 'invalid' | 'paused';
  } = {}
): Promise<void> {
  await page.route('**/api/join**', async (route) => {
    const request = route.request();
    const method = request.method();

    if (method === 'GET') {
      if (options.preview === 'not_found') {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: 404,
            message: 'cities.invalid_join_token',
          }),
        });
        return;
      }
      await jsonFulfill(route, {
        cityId: '11111111-1111-4111-8111-111111111111',
        citySlug: 'holon',
        cityNameHe: 'חולון',
        cityNameEn: 'Holon',
        role: 'volunteer',
        ...options.preview,
      });
      return;
    }

    if (method === 'POST') {
      if (options.redeem === 'invalid') {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: 404,
            message: 'cities.invalid_join_token',
          }),
        });
        return;
      }
      if (options.redeem === 'paused') {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: 409,
            message: 'cities.membership_paused',
          }),
        });
        return;
      }
      await jsonFulfill(route, {
        result: 'pending',
        membership: {
          membershipId: '99999999-9999-4999-8999-999999999999',
          cityId: '11111111-1111-4111-8111-111111111111',
          citySlug: 'holon',
          cityNameHe: 'חולון',
          cityNameEn: 'Holon',
          role: 'volunteer',
          status: 'pending',
        },
        ...options.redeem,
      });
      return;
    }

    await route.fallback();
  });
}

export async function stubElderChangeRequestApi(
  page: Page,
  options: {
    changeRequests?: Array<Record<string, unknown>>;
    onCreate?: (body: Record<string, unknown>) => Record<string, unknown>;
    onApprove?: (requestId: string) => void;
    onReject?: (requestId: string, body: Record<string, unknown>) => void;
  } = {}
): Promise<void> {
  let changeRequests = [...(options.changeRequests ?? [])];

  await page.route('**/api/cities/*/elder-change-requests**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const pathname = url.pathname.replace(/\/$/, '');

    if (method === 'POST' && pathname.endsWith('/approve')) {
      const requestId = pathname.split('/').at(-2) ?? '';
      if (options.onApprove !== undefined) {
        options.onApprove(requestId);
      }
      const current =
        changeRequests.find((row) => row.id === requestId) ?? changeRequests[0];
      changeRequests = changeRequests.filter((row) => row.id !== requestId);
      await jsonFulfill(route, {
        ...current,
        status: 'approved',
        reviewedAt: '2026-10-31T12:00:00.000Z',
      });
      return;
    }

    if (method === 'POST' && pathname.endsWith('/reject')) {
      const requestId = pathname.split('/').at(-2) ?? '';
      const raw = request.postData();
      const body =
        raw === null || raw.length === 0
          ? {}
          : (JSON.parse(raw) as Record<string, unknown>);
      if (options.onReject !== undefined) {
        options.onReject(requestId, body);
      }
      const current =
        changeRequests.find((row) => row.id === requestId) ?? changeRequests[0];
      changeRequests = changeRequests.filter((row) => row.id !== requestId);
      await jsonFulfill(route, {
        ...current,
        status: 'rejected',
        reviewNote:
          typeof body.reviewNote === 'string' ? body.reviewNote : null,
        reviewedAt: '2026-10-31T12:05:00.000Z',
      });
      return;
    }

    if (method === 'POST') {
      const raw = request.postData();
      const body =
        raw === null || raw.length === 0
          ? {}
          : (JSON.parse(raw) as Record<string, unknown>);
      const created =
        options.onCreate !== undefined
          ? options.onCreate(body)
          : {
              id: '21212121-2121-4212-8212-212121212121',
              cityId: CITY_A_ID,
              elderId: body.elderId,
              requestedById: FAKE_USER_ID,
              changes: body.changes,
              reason: body.reason ?? null,
              status: 'pending',
              reviewedById: null,
              reviewedAt: null,
              reviewNote: null,
              createdAt: '2026-10-31T09:00:00.000Z',
              updatedAt: '2026-10-31T09:00:00.000Z',
              elder: {
                id: body.elderId,
                fullName: 'Rivkah Levi',
                street: '12 Example St',
                houseNumber: '12',
                entrance: 'B',
                floor: '3',
                apartment: '7',
                addressNotes: 'Knock loudly',
                notes: 'Entrance is around the back',
                contacts: [],
              },
              requestedBy: {
                id: FAKE_USER_ID,
                firstName: 'Noa',
                lastName: 'Cohen',
              },
            };
      changeRequests = [created, ...changeRequests];
      await jsonFulfill(route, created);
      return;
    }

    if (method === 'GET') {
      await jsonFulfill(route, { changeRequests });
      return;
    }

    await route.fallback();
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
