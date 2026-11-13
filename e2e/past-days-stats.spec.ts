import { expect, test } from '@playwright/test';
import { stubAuthenticatedSession } from './auth-stubs';

const CITY_A_ID = '11111111-1111-4111-8111-111111111111';
const CLOSED_DAY_OCT_ID = '55555555-5555-4555-8555-555555555555';
const CLOSED_DAY_SEP_ID = '66666666-6666-4666-8666-666666666666';

test.describe('Coordinator past distribution-day stats', () => {
  test('opens Holon past-day stats from home and toggles English', async ({
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
      (url) =>
        /\/api\/cities\/[^/]+\/distribution-days\/stats\/?$/.test(url.pathname),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            cityId: CITY_A_ID,
            days: [
              {
                dayId: CLOSED_DAY_OCT_ID,
                date: '2026-10-15',
                status: 'closed',
                eldersServed: 2,
                packagesDelivered: 2,
                packagesNotDelivered: 1,
                packagesOpen: 0,
                volunteersConfirmed: 3,
                volunteersDeclined: 1,
              },
              {
                dayId: CLOSED_DAY_SEP_ID,
                date: '2026-09-15',
                status: 'closed',
                eldersServed: 1,
                packagesDelivered: 1,
                packagesNotDelivered: 0,
                packagesOpen: 1,
                volunteersConfirmed: 2,
                volunteersDeclined: 0,
              },
            ],
            totals: {
              days: 2,
              eldersServed: 3,
              packagesDelivered: 3,
              packagesNotDelivered: 1,
              packagesOpen: 1,
              volunteersConfirmed: 5,
              volunteersDeclined: 1,
            },
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
    await expect(page.getByTestId('home-page')).toBeVisible();
    await page.getByTestId('view-past-days-stats').click();

    await expect(
      page.getByTestId('coordinator-past-days-stats-page')
    ).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByTestId('past-days-stats-total-days')).toContainText(
      '2'
    );
    await expect(
      page.getByTestId('past-days-stats-elders-served')
    ).toContainText('3');
    await expect(page.getByTestId('past-days-stats-delivered')).toContainText(
      '3'
    );
    await expect(
      page.getByTestId('past-days-stats-not-delivered')
    ).toContainText('1');
    await expect(page.getByTestId('past-days-stats-open')).toContainText('1');
    await expect(page.getByTestId('past-days-stats-confirmed')).toContainText(
      '5'
    );
    await expect(page.getByTestId('past-days-stats-declined')).toContainText(
      '1'
    );
    await expect(
      page.getByTestId(`past-day-stats-row-${CLOSED_DAY_OCT_ID}`)
    ).toBeVisible();

    await page.getByRole('button', { name: 'English' }).click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(
      page.getByTestId('coordinator-past-days-stats-page')
    ).toContainText('Past distribution days');
  });
});
