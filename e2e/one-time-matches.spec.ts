import { expect, test } from '@playwright/test';
import { stubAuthenticatedSession } from './auth-stubs';

const CITY_A_ID = '11111111-1111-4111-8111-111111111111';
const DAY_ID = '33333333-3333-4333-8333-333333333333';
const ONE_TIME_MATCH_RIVKAH_ID = '16161616-1616-4161-8161-161616161616';
const ELDER_RIVKAH_ID = '12121212-1212-4121-8121-121212121212';
const ELDER_YOSEF_ID = '13131313-1313-4131-8131-131313131313';
const VOLUNTEER_YONATAN_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const VOLUNTEER_DANA_ID = '99999999-9999-4999-8999-999999999999';

const DAY_PAYLOAD = {
  id: DAY_ID,
  cityId: CITY_A_ID,
  date: '2026-11-12',
  startTime: '09:00:00',
  endTime: '14:00:00',
  notesForVolunteers: null,
  addOns: [],
  status: 'published',
  publishedAt: '2026-11-01T09:00:00.000Z',
  closedAt: null,
  createdAt: '2026-11-01T09:00:00.000Z',
  updatedAt: '2026-11-01T09:00:00.000Z',
};

const RIVKAH_MATCH = {
  id: ONE_TIME_MATCH_RIVKAH_ID,
  cityId: CITY_A_ID,
  elderId: ELDER_RIVKAH_ID,
  volunteerId: VOLUNTEER_YONATAN_ID,
  type: 'one_time',
  dayId: DAY_ID,
  startsAt: '2026-11-12',
  endsAt: null,
  endReason: null,
  createdAt: '2026-11-01T09:00:00.000Z',
  updatedAt: '2026-11-01T09:00:00.000Z',
  elder: {
    id: ELDER_RIVKAH_ID,
    fullName: 'Rivkah Levi',
    status: 'active',
  },
  volunteer: {
    id: VOLUNTEER_YONATAN_ID,
    firstName: 'Yonatan',
    lastName: 'Bar',
  },
};

const YOSEF_MATCH = {
  id: '17171717-1717-4171-8171-171717171717',
  cityId: CITY_A_ID,
  elderId: ELDER_YOSEF_ID,
  volunteerId: VOLUNTEER_DANA_ID,
  type: 'one_time',
  dayId: DAY_ID,
  startsAt: '2026-11-12',
  endsAt: null,
  endReason: null,
  createdAt: '2026-11-12T09:00:00.000Z',
  updatedAt: '2026-11-12T09:00:00.000Z',
  elder: {
    id: ELDER_YOSEF_ID,
    fullName: 'Yosef Abraham',
    status: 'active',
  },
  volunteer: {
    id: VOLUNTEER_DANA_ID,
    firstName: 'Dana',
    lastName: 'Levi',
  },
};

const MATCHABLE_VOLUNTEERS = [
  {
    id: VOLUNTEER_YONATAN_ID,
    firstName: 'Yonatan',
    lastName: 'Bar',
  },
  {
    id: VOLUNTEER_DANA_ID,
    firstName: 'Dana',
    lastName: 'Levi',
  },
];

const DELIVERY_YOSEF_ID = '17171717-1717-4171-8171-171717171717';

function yosefDelivery(assigned: boolean): Record<string, unknown> {
  return {
    id: DELIVERY_YOSEF_ID,
    cityId: CITY_A_ID,
    dayId: DAY_ID,
    status: assigned ? 'assigned' : 'unassigned',
    note: null,
    notDeliveredReason: null,
    volunteerId: assigned ? VOLUNTEER_DANA_ID : null,
    matchId: assigned ? YOSEF_MATCH.id : null,
    assignedAt: assigned ? '2026-11-12T09:00:00.000Z' : null,
    volunteer: assigned
      ? {
          id: VOLUNTEER_DANA_ID,
          firstName: 'Dana',
          lastName: 'Levi',
        }
      : null,
    elder: {
      id: ELDER_YOSEF_ID,
      fullName: 'Yosef Abraham',
      street: '4 Park Ave',
      houseNumber: '4',
      entrance: null,
      floor: null,
      apartment: null,
      addressNotes: null,
      notes: null,
      contacts: [],
    },
    replacementSuggestions: assigned
      ? []
      : [
          {
            id: VOLUNTEER_DANA_ID,
            firstName: 'Dana',
            lastName: 'Levi',
            homeArea: 'Park',
          },
        ],
  };
}

test.describe('Coordinator one-time matches', () => {
  test('coordinator adds a one-time match on the day view and sees deliveries update', async ({
    page,
  }) => {
    const created: Record<string, unknown>[] = [];
    const ended: Record<string, unknown>[] = [];
    let yosefAssigned = false;
    let rivkahMatchActive = true;

    await stubAuthenticatedSession(page, {
      onboarded: true,
      firstName: 'Noa',
      lastName: 'Levi',
      memberships: [
        {
          cityId: CITY_A_ID,
          role: 'coordinator',
          status: 'active',
        },
      ],
    });

    await page.route('**/api/cities/*/distribution-days', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          days: [DAY_PAYLOAD],
        }),
      });
    });

    await page.route(
      '**/api/cities/*/distribution-days/*/one-time-matches/**',
      async (route) => {
        const request = route.request();
        if (request.method() === 'POST' && request.url().includes('/end')) {
          const raw = request.postData();
          const body =
            raw === null || raw.length === 0
              ? {}
              : (JSON.parse(raw) as Record<string, unknown>);
          ended.push(body);
          rivkahMatchActive = false;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ...RIVKAH_MATCH,
              endsAt: '2026-11-12',
              endReason: body.endReason ?? 'reassigned',
              updatedAt: '2026-11-12T09:00:00.000Z',
            }),
          });
          return;
        }
        await route.fallback();
      }
    );

    await page.route(
      '**/api/cities/*/distribution-days/*/one-time-matches',
      async (route) => {
        const request = route.request();
        if (request.method() === 'POST') {
          const raw = request.postData();
          const body =
            raw === null || raw.length === 0
              ? {}
              : (JSON.parse(raw) as Record<string, unknown>);
          created.push(body);
          yosefAssigned = true;
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify(YOSEF_MATCH),
          });
          return;
        }

        const matches = [
          ...(rivkahMatchActive ? [RIVKAH_MATCH] : []),
          ...(yosefAssigned ? [YOSEF_MATCH] : []),
        ];
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            matches,
            availableElders: yosefAssigned
              ? []
              : [
                  {
                    id: ELDER_YOSEF_ID,
                    fullName: 'Yosef Abraham',
                    status: 'active',
                  },
                ],
            matchableVolunteers: MATCHABLE_VOLUNTEERS,
          }),
        });
      }
    );

    await page.route(
      `**/api/cities/${CITY_A_ID}/distribution-days/${DAY_ID}/deliveries`,
      async (route) => {
        if (route.request().method() !== 'GET') {
          await route.fallback();
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            dayId: DAY_ID,
            cityId: CITY_A_ID,
            cityNameHe: 'חולון',
            cityNameEn: 'Holon',
            centerAddress: '10 Warehouse Rd, Holon',
            unassignedCount: yosefAssigned ? 0 : 1,
            assignableVolunteers: MATCHABLE_VOLUNTEERS,
            deliveries: [
              {
                id: '16161616-1616-4161-8161-161616161616',
                cityId: CITY_A_ID,
                dayId: DAY_ID,
                status: 'assigned',
                note: null,
                notDeliveredReason: null,
                volunteerId: VOLUNTEER_YONATAN_ID,
                matchId: ONE_TIME_MATCH_RIVKAH_ID,
                assignedAt: '2026-11-01T09:00:00.000Z',
                volunteer: {
                  id: VOLUNTEER_YONATAN_ID,
                  firstName: 'Yonatan',
                  lastName: 'Bar',
                },
                elder: {
                  id: ELDER_RIVKAH_ID,
                  fullName: 'Rivkah Levi',
                  street: '12 Example St',
                  houseNumber: '12',
                  entrance: null,
                  floor: null,
                  apartment: null,
                  addressNotes: null,
                  notes: null,
                  contacts: [],
                },
                replacementSuggestions: [],
              },
              yosefDelivery(yosefAssigned),
            ],
          }),
        });
      }
    );

    await page.route(
      `**/api/cities/${CITY_A_ID}/distribution-days/${DAY_ID}`,
      async (route) => {
        if (route.request().method() !== 'GET') {
          await route.fallback();
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(DAY_PAYLOAD),
        });
      }
    );

    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.getByRole('button', { name: 'צפייה במשלוחים' }).click();
    await expect(page).toHaveURL(
      `/cities/${CITY_A_ID}/days/${DAY_ID}/deliveries`
    );
    await expect(page.getByTestId('coordinator-deliveries-page')).toBeVisible();
    await expect(
      page.getByTestId('coordinator-one-time-matches-panel')
    ).toBeVisible();
    await expect(page.getByTestId('delivery-row-unassigned')).toBeVisible();

    await page.getByLabel('בחירת מבוגר/ת').selectOption(ELDER_YOSEF_ID);
    await page.getByLabel('בחירת מתנדב/ת').selectOption(VOLUNTEER_DANA_ID);
    await page.getByTestId('create-one-time-match-submit').click();
    await expect
      .poll(() => created)
      .toEqual([{ elderId: ELDER_YOSEF_ID, volunteerId: VOLUNTEER_DANA_ID }]);
    await expect(
      page.getByTestId('one-time-match-deliveries-updated')
    ).toBeVisible();
    await expect(page.getByTestId('delivery-row-unassigned')).toHaveCount(0);
    await expect(
      page.getByTestId(`assign-delivery-${DELIVERY_YOSEF_ID}`)
    ).toHaveValue(VOLUNTEER_DANA_ID);

    await page
      .getByTestId(`one-time-match-row-${ONE_TIME_MATCH_RIVKAH_ID}`)
      .getByLabel('סיבת הסיום')
      .selectOption('reassigned');
    await page
      .getByTestId(`end-one-time-match-${ONE_TIME_MATCH_RIVKAH_ID}`)
      .click();
    await expect(ended).toEqual([]);
    await page
      .getByTestId(`confirm-end-one-time-match-${ONE_TIME_MATCH_RIVKAH_ID}`)
      .click();
    await expect.poll(() => ended).toEqual([{ endReason: 'reassigned' }]);
  });

  test('create shows error when volunteer is not confirmed for the day', async ({
    page,
  }) => {
    await stubAuthenticatedSession(page, {
      onboarded: true,
      firstName: 'Noa',
      lastName: 'Levi',
      memberships: [
        {
          cityId: CITY_A_ID,
          role: 'coordinator',
          status: 'active',
        },
      ],
    });

    await page.route(
      `**/api/cities/${CITY_A_ID}/distribution-days/${DAY_ID}`,
      async (route) => {
        if (route.request().method() !== 'GET') {
          await route.fallback();
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: DAY_ID,
            cityId: CITY_A_ID,
            date: '2026-11-12',
            startTime: '09:00:00',
            endTime: '14:00:00',
            notesForVolunteers: null,
            addOns: [],
            status: 'published',
            publishedAt: '2026-11-01T09:00:00.000Z',
            closedAt: null,
            createdAt: '2026-11-01T09:00:00.000Z',
            updatedAt: '2026-11-01T09:00:00.000Z',
          }),
        });
      }
    );

    await page.route(
      '**/api/cities/*/distribution-days/*/one-time-matches',
      async (route) => {
        const request = route.request();
        if (request.method() === 'POST') {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              statusCode: 400,
              message: 'matches.volunteer_not_confirmed',
            }),
          });
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            matches: [],
            availableElders: [
              {
                id: ELDER_YOSEF_ID,
                fullName: 'Yosef Abraham',
                status: 'active',
              },
            ],
            // Only day-confirmed volunteers appear in the assign list.
            matchableVolunteers: [
              {
                id: VOLUNTEER_DANA_ID,
                firstName: 'Dana',
                lastName: 'Levi',
              },
            ],
          }),
        });
      }
    );

    await page.goto(`/cities/${CITY_A_ID}/days/${DAY_ID}/one-time-matches`);
    await expect(
      page.getByTestId('coordinator-one-time-matches-page')
    ).toBeVisible();
    await page.getByLabel('בחירת מבוגר/ת').selectOption(ELDER_YOSEF_ID);
    await page.getByLabel('בחירת מתנדב/ת').selectOption(VOLUNTEER_DANA_ID);
    await page.getByTestId('create-one-time-match-submit').click();
    await expect(page.getByTestId('create-one-time-match-error')).toHaveText(
      'אפשר לשבץ רק מתנדב/ת שאישר/ה השתתפות ליום החלוקה הזה.'
    );
  });

  test('volunteer who opens the one-time matches URL sees no access', async ({
    page,
  }) => {
    const matchesRequested: string[] = [];

    await stubAuthenticatedSession(page, {
      onboarded: true,
      firstName: 'Dana',
      lastName: 'Levi',
      memberships: [
        {
          cityId: CITY_A_ID,
          role: 'volunteer',
          status: 'active',
        },
      ],
    });

    await page.route('**/api/cities/*/distribution-days', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ days: [] }),
      });
    });

    await page.route(
      '**/api/cities/*/distribution-days/*/one-time-matches**',
      async (route) => {
        matchesRequested.push(route.request().url());
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: 404,
            message: 'cities.not_found',
          }),
        });
      }
    );

    await page.goto('/');
    await expect(page.getByTestId('home-page')).toBeVisible();
    await expect(page.getByTestId('view-one-time-matches')).toHaveCount(0);

    await page.goto(`/cities/${CITY_A_ID}/days/${DAY_ID}/one-time-matches`);
    await expect(page.getByTestId('one-time-matches-no-access')).toBeVisible();
    await expect(
      page.getByTestId('coordinator-one-time-matches-table')
    ).toHaveCount(0);
    await expect(page.getByTestId('create-one-time-match-form')).toHaveCount(0);
    expect(matchesRequested).toEqual([]);
  });
});
