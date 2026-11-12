import { expect, test } from '@playwright/test';
import { stubAuthenticatedSession } from './auth-stubs';

const CITY_A_ID = '11111111-1111-4111-8111-111111111111';
const DAY_ID = '33333333-3333-4333-8333-333333333333';
const MEMBERSHIP_YONATAN_ID = '66666666-6666-4666-8666-666666666666';
const MEMBERSHIP_DANA_ID = '77777777-7777-4777-8777-777777777777';
const MEMBERSHIP_TAMAR_ID = '88888888-8888-4888-8888-888888888888';

test.describe('Coordinator volunteers', () => {
  test('coordinator searches and filters Holon volunteers', async ({
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
              date: '2026-11-15',
              startTime: '09:00:00',
              endTime: '14:00:00',
              notesForVolunteers: 'Bring a folding cart',
              addOns: [],
              status: 'published',
              publishedAt: '2026-10-28T09:00:00.000Z',
              closedAt: null,
              myParticipation: null,
            },
          ],
        }),
      });
    });

    await page.route(
      (url) => /\/api\/cities\/[^/]+\/volunteers\/?/.test(url.pathname),
      async (route) => {
        const requestUrl = new URL(route.request().url());
        const status = requestUrl.searchParams.get('status');
        const search = requestUrl.searchParams.get('search') ?? '';
        const dayId = requestUrl.searchParams.get('dayId');
        const dayResponse = requestUrl.searchParams.get('dayResponse');

        const rows = [
          {
            membershipId: MEMBERSHIP_YONATAN_ID,
            userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            firstName: 'Yonatan',
            lastName: 'Bar',
            email: 'yonatan.bar@example.com',
            phone: '+972502222222',
            role: 'volunteer',
            status: 'active',
            createdAt: '2026-10-01T09:00:00.000Z',
            approvedAt: '2026-10-01T09:00:00.000Z',
            homeArea: 'North',
            dayResponseStatus: dayId === DAY_ID ? ('confirmed' as const) : null,
            cancelReason: null,
          },
          {
            membershipId: MEMBERSHIP_DANA_ID,
            userId: '99999999-9999-4999-8999-999999999999',
            firstName: 'Dana',
            lastName: 'Levi',
            email: 'dana.levi@example.com',
            phone: '+972505555555',
            role: 'volunteer',
            status: 'active',
            createdAt: '2026-10-02T09:00:00.000Z',
            approvedAt: '2026-10-02T09:00:00.000Z',
            homeArea: 'South',
            dayResponseStatus: dayId === DAY_ID ? ('declined' as const) : null,
            cancelReason: dayId === DAY_ID ? 'Out of town' : null,
          },
          {
            membershipId: MEMBERSHIP_TAMAR_ID,
            userId: '12121212-1212-4121-8121-121212121212',
            firstName: 'Tamar',
            lastName: 'Shalev',
            email: 'tamar.shalev@example.com',
            phone: '+972506666666',
            role: 'volunteer',
            status: 'pending',
            createdAt: '2026-10-28T09:00:00.000Z',
            approvedAt: null,
            homeArea: null,
            dayResponseStatus:
              dayId === DAY_ID ? ('no_response' as const) : null,
            cancelReason: null,
          },
        ].filter((row) => {
          if (status !== null && row.status !== status) {
            return false;
          }
          if (
            search.length > 0 &&
            !`${row.firstName} ${row.lastName}`.includes(search)
          ) {
            return false;
          }
          if (dayResponse !== null && row.dayResponseStatus !== dayResponse) {
            return false;
          }
          return true;
        });

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ volunteers: rows }),
        });
      }
    );

    await page.goto(`/cities/${CITY_A_ID}/volunteers`);

    await expect(page.getByTestId('coordinator-volunteers-page')).toBeVisible();
    await expect(
      page.getByTestId(`volunteer-row-${MEMBERSHIP_YONATAN_ID}`)
    ).toBeVisible();
    await expect(
      page.getByTestId(`volunteer-row-${MEMBERSHIP_DANA_ID}`)
    ).toBeVisible();

    await page.getByTestId('volunteer-search').fill('Yonatan');
    await expect(
      page.getByTestId(`volunteer-row-${MEMBERSHIP_YONATAN_ID}`)
    ).toBeVisible();
    await expect(
      page.getByTestId(`volunteer-row-${MEMBERSHIP_DANA_ID}`)
    ).toHaveCount(0);

    await page.getByTestId('volunteer-search').fill('');
    await page.getByTestId('volunteer-status-filter').selectOption('pending');
    await expect(
      page.getByTestId(`volunteer-row-${MEMBERSHIP_TAMAR_ID}`)
    ).toBeVisible();
    await expect(
      page.getByTestId(`volunteer-row-${MEMBERSHIP_YONATAN_ID}`)
    ).toHaveCount(0);

    await page.getByTestId('volunteer-filters-clear').click();
    await page.getByTestId('volunteer-day-filter').selectOption(DAY_ID);
    await page
      .getByTestId('volunteer-day-response-filter')
      .selectOption('declined');
    await expect(
      page.getByTestId(`volunteer-row-${MEMBERSHIP_DANA_ID}`)
    ).toBeVisible();
    await expect(
      page.getByTestId(`volunteer-row-${MEMBERSHIP_YONATAN_ID}`)
    ).toHaveCount(0);
  });
});
