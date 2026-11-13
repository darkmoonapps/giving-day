import { expect, test } from '@playwright/test';
import { stubAuthenticatedSession } from './auth-stubs';

const CITY_A_ID = '11111111-1111-4111-8111-111111111111';
const ENTRY_NEWER_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const ENTRY_OLDER_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const ACTOR_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const MEMBERSHIP_ID = '99999999-9999-4999-8999-999999999999';
const USER_TAMAR_ID = '12121212-1212-4121-8121-121212121212';

test.describe('Coordinator audit log', () => {
  test('opens Holon audit log from home and toggles English', async ({
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
      (url) => /\/api\/cities\/[^/]+\/audit-logs\/?$/.test(url.pathname),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            entries: [
              {
                id: ENTRY_NEWER_ID,
                cityId: CITY_A_ID,
                actorId: ACTOR_ID,
                action: 'membership.approve',
                entity: 'membership',
                entityId: MEMBERSHIP_ID,
                diff: { userId: USER_TAMAR_ID, role: 'volunteer' },
                at: '2026-11-13T10:00:00.000Z',
              },
              {
                id: ENTRY_OLDER_ID,
                cityId: CITY_A_ID,
                actorId: ACTOR_ID,
                action: 'delivery.assign',
                entity: 'delivery',
                entityId: '16161616-1616-4161-8161-161616161616',
                diff: {
                  dayId: '33333333-3333-4333-8333-333333333333',
                  fromVolunteerId: null,
                  toVolunteerId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
                },
                at: '2026-11-13T09:00:00.000Z',
              },
            ],
            page: 1,
            pageSize: 20,
            total: 2,
          }),
        });
      }
    );

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

    await page.goto('/');
    await page.getByTestId('view-audit-log').click();
    await expect(page.getByTestId('coordinator-audit-log-page')).toBeVisible();
    await expect(page.getByTestId('audit-log-table')).toBeVisible();
    await expect(
      page.getByTestId(`audit-log-row-${ENTRY_NEWER_ID}`)
    ).toBeVisible();
    await expect(page.getByTestId('sort-action')).toBeVisible();
    await expect(page.getByTestId('filter-audit-action')).toBeVisible();

    await page
      .getByTestId('filter-audit-action')
      .selectOption('delivery.assign');
    await expect(
      page.getByTestId(`audit-log-row-${ENTRY_OLDER_ID}`)
    ).toBeVisible();
    await expect(
      page.getByTestId(`audit-log-row-${ENTRY_NEWER_ID}`)
    ).toHaveCount(0);

    await page.getByTestId('clear-audit-log-filters').click();
    await page.getByRole('button', { name: 'English' }).click();
    await expect(
      page.getByTestId(`audit-log-action-${ENTRY_NEWER_ID}`)
    ).toHaveText('Approve join request');
  });
});
