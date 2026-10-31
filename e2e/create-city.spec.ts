import { expect, test } from '@playwright/test';
import { stubAuthenticatedSession } from './auth-stubs';

const EXAMPLE_CITY_ID = '22222222-2222-4222-8222-222222222222';

const exampleSettings = {
  cityId: EXAMPLE_CITY_ID,
  centerAddress: '-',
  centerLat: 0,
  centerLng: 0,
  defaultStartTime: '09:00:00',
  defaultEndTime: '14:00:00',
  confirmReminderAfterHours: 24,
  unpickedPushMinutesBeforeEnd: 60,
  missingFinalStatusWaitHours: 72,
  defaultLocale: 'he',
  defaultTheme: 'wisteria-mint',
  orgName: null,
  logoUrl: null,
  extra: {},
};

test.describe('Super admin create city', () => {
  test('super admin creates a city from home and lands on settings', async ({
    page,
  }) => {
    const creates: Record<string, unknown>[] = [];

    await stubAuthenticatedSession(page, {
      onboarded: true,
      firstName: 'Super',
      lastName: 'Admin',
      isSuperAdmin: true,
      memberships: [],
    });

    await page.route('**/api/cities', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }
      const raw = route.request().postData();
      const body =
        raw === null || raw.length === 0
          ? {}
          : (JSON.parse(raw) as Record<string, unknown>);
      creates.push(body);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: EXAMPLE_CITY_ID,
          slug: 'example-city',
          nameHe: 'עיר דוגמה',
          nameEn: 'Example City',
          timezone: 'Asia/Jerusalem',
          isActive: true,
        }),
      });
    });

    await page.route(
      `**/api/cities/${EXAMPLE_CITY_ID}/settings`,
      async (route) => {
        if (route.request().method() !== 'GET') {
          await route.fallback();
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(exampleSettings),
        });
      }
    );

    await page.route(
      `**/api/cities/${EXAMPLE_CITY_ID}/join-links`,
      async (route) => {
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
                active: false,
                createdAt: null,
                usedCount: 0,
              },
            ],
          }),
        });
      }
    );

    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByTestId('create-city')).toBeVisible();
    await page.getByTestId('create-city').click();
    await expect(page).toHaveURL('/admin/cities/new');
    await expect(page.getByTestId('create-city-form')).toBeVisible();

    await page.getByLabel(/שם בעברית/).fill('עיר דוגמה');
    await page.getByLabel(/שם באנגלית/).fill('Example City');
    await page.getByLabel(/מזהה כתובת/).fill('example-city');
    await page.getByTestId('create-city-submit').click();

    await expect(page).toHaveURL(`/cities/${EXAMPLE_CITY_ID}/settings`);
    await expect(page.getByTestId('city-settings-form')).toBeVisible();
    await expect.poll(() => creates).toHaveLength(1);
    expect(creates[0]).toEqual({
      slug: 'example-city',
      nameHe: 'עיר דוגמה',
      nameEn: 'Example City',
    });
  });

  test('volunteer cannot see or use create city', async ({ page }) => {
    await stubAuthenticatedSession(page, {
      onboarded: true,
      memberships: [
        {
          cityId: '11111111-1111-4111-8111-111111111111',
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
    await expect(page.getByTestId('create-city')).toHaveCount(0);

    await page.goto('/admin/cities/new');
    await expect(page.getByTestId('create-city-page')).toBeVisible();
    await expect(page.getByTestId('create-city-form')).toHaveCount(0);
  });
});
