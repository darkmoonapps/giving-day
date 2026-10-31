import { expect, test } from '@playwright/test';
import { stubAuthenticatedSession } from './auth-stubs';

const CITY_A_ID = '11111111-1111-4111-8111-111111111111';

const holonSettings = {
  cityId: CITY_A_ID,
  centerAddress: '10 Warehouse Rd, Holon',
  centerLat: 32.0114,
  centerLng: 34.7748,
  defaultStartTime: '09:00:00',
  defaultEndTime: '14:00:00',
  confirmReminderAfterHours: 24,
  unpickedPushMinutesBeforeEnd: 60,
  missingFinalStatusWaitHours: 72,
  defaultLocale: 'he',
  defaultTheme: 'wisteria-mint',
  orgName: 'Latet Holon',
  logoUrl: null,
  extra: { mapZoom: 14 },
};

test.describe('Coordinator city settings', () => {
  test('coordinator opens Holon settings from home and saves an address', async ({
    page,
  }) => {
    const patches: Record<string, unknown>[] = [];
    let settings = { ...holonSettings };

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
        body: JSON.stringify({ days: [] }),
      });
    });

    await page.route('**/api/cities/*/join-links', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          links: [
            {
              role: 'coordinator',
              active: false,
              createdAt: null,
              usedCount: 0,
            },
            {
              role: 'volunteer',
              active: true,
              createdAt: '2026-10-01T09:00:00.000Z',
              usedCount: 2,
            },
          ],
        }),
      });
    });

    await page.route('**/api/cities/*/settings', async (route) => {
      const request = route.request();
      if (request.method() === 'PATCH') {
        const raw = request.postData();
        const body =
          raw === null || raw.length === 0
            ? {}
            : (JSON.parse(raw) as Record<string, unknown>);
        patches.push(body);
        settings = {
          ...settings,
          ...body,
          extra: settings.extra,
        };
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(settings),
        });
        return;
      }

      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(settings),
        });
        return;
      }

      await route.fallback();
    });

    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.getByTestId('view-settings').click();
    await expect(page).toHaveURL(`/cities/${CITY_A_ID}/settings`);
    await expect(page.getByTestId('city-settings-form')).toBeVisible();
    await expect(page.getByLabel(/כתובת מרכז החלוקה/)).toHaveValue(
      '10 Warehouse Rd, Holon'
    );
    await expect(page.getByLabel('שם הארגון')).toHaveValue('Latet Holon');

    await page.getByLabel(/כתובת מרכז החלוקה/).fill('12 Example St, Holon');
    await page.getByTestId('save-city-settings').click();
    await expect(page.getByTestId('city-settings-success')).toBeVisible();
    await expect.poll(() => patches).toHaveLength(1);
    expect(patches[0]).toMatchObject({
      centerAddress: '12 Example St, Holon',
      centerLat: 32.0114,
      orgName: 'Latet Holon',
    });
  });

  test('volunteer cannot open city settings', async ({ page }) => {
    await stubAuthenticatedSession(page, {
      onboarded: true,
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

    await page.goto('/');
    await expect(page.getByTestId('home-page')).toBeVisible();
    await expect(page.getByTestId('view-settings')).toHaveCount(0);

    await page.goto(`/cities/${CITY_A_ID}/settings`);
    await expect(page.getByTestId('city-settings-page')).toBeVisible();
    await expect(page.getByTestId('city-settings-form')).toHaveCount(0);
  });
});
