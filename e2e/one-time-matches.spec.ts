import { expect, test } from '@playwright/test';
import { stubAuthenticatedSession } from './auth-stubs';

const CITY_A_ID = '11111111-1111-4111-8111-111111111111';
const DAY_ID = '33333333-3333-4333-8333-333333333333';
const ONE_TIME_MATCH_RIVKAH_ID = '16161616-1616-4161-8161-161616161616';
const ELDER_RIVKAH_ID = '12121212-1212-4121-8121-121212121212';
const ELDER_YOSEF_ID = '13131313-1313-4131-8131-131313131313';
const VOLUNTEER_YONATAN_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const VOLUNTEER_DANA_ID = '99999999-9999-4999-8999-999999999999';

test.describe('Coordinator one-time matches', () => {
  test('coordinator lists, creates, and ends a Holon one-time match', async ({
    page,
  }) => {
    const created: Record<string, unknown>[] = [];
    const ended: Record<string, unknown>[] = [];

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
          days: [
            {
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
            },
          ],
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
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: ONE_TIME_MATCH_RIVKAH_ID,
              cityId: CITY_A_ID,
              elderId: ELDER_RIVKAH_ID,
              volunteerId: VOLUNTEER_YONATAN_ID,
              type: 'one_time',
              dayId: DAY_ID,
              startsAt: '2026-11-12',
              endsAt: '2026-11-12',
              endReason: body.endReason ?? 'reassigned',
              createdAt: '2026-11-01T09:00:00.000Z',
              updatedAt: '2026-11-12T09:00:00.000Z',
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
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: '17171717-1717-4171-8171-171717171717',
              cityId: CITY_A_ID,
              elderId: body.elderId,
              volunteerId: body.volunteerId,
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
            }),
          });
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            matches: [
              {
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
              },
            ],
            availableElders: [
              {
                id: ELDER_YOSEF_ID,
                fullName: 'Yosef Abraham',
                status: 'active',
              },
            ],
            // Volunteers listed here are day-confirmed (API filters on DayParticipation).
            matchableVolunteers: [
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

    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.getByTestId('view-one-time-matches').click();
    await expect(page).toHaveURL(
      `/cities/${CITY_A_ID}/days/${DAY_ID}/one-time-matches`
    );
    await expect(
      page.getByTestId('coordinator-one-time-matches-page')
    ).toBeVisible();
    await expect(
      page.getByTestId(`one-time-match-row-${ONE_TIME_MATCH_RIVKAH_ID}`)
    ).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Rivkah Levi' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Yonatan Bar' })).toBeVisible();

    await page.getByLabel('בחירת מבוגר/ת').selectOption(ELDER_YOSEF_ID);
    await page.getByLabel('בחירת מתנדב/ת').selectOption(VOLUNTEER_DANA_ID);
    await page.getByTestId('create-one-time-match-submit').click();
    await expect
      .poll(() => created)
      .toEqual([{ elderId: ELDER_YOSEF_ID, volunteerId: VOLUNTEER_DANA_ID }]);

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
