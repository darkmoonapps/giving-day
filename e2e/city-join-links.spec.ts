import { expect, test } from '@playwright/test';
import { stubAuthenticatedSession } from './auth-stubs';

const CITY_A_ID = '11111111-1111-4111-8111-111111111111';
const HOLON_VOLUNTEER_URL =
  'http://localhost:3000/join/fake-holon-volunteer-token';

interface JoinLinkStatus {
  role: 'coordinator' | 'volunteer';
  active: boolean;
  createdAt: string | null;
  usedCount: number;
}

test.describe('Coordinator city join links', () => {
  test('coordinator copies a regenerated Holon volunteer join link', async ({
    page,
  }) => {
    const regenerations: string[] = [];
    let links: JoinLinkStatus[] = [
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
    ];

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

    await page.route('**/api/cities/*/settings', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
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
        }),
      });
    });

    await page.route('**/api/cities/*/join-links/**', async (route) => {
      const request = route.request();
      if (request.method() !== 'POST') {
        await route.fallback();
        return;
      }

      const url = new URL(request.url());
      const role = url.pathname.includes('/coordinator/')
        ? 'coordinator'
        : 'volunteer';
      regenerations.push(role);
      const createdAt = '2026-10-31T12:00:00.000Z';
      links = links.map((link) =>
        link.role === role
          ? {
              role,
              active: true,
              createdAt,
              usedCount: 0,
            }
          : link
      );
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          role,
          token: `fake-holon-${role}-token`,
          url: `http://localhost:3000/join/fake-holon-${role}-token`,
          createdAt,
          usedCount: 0,
        }),
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
        body: JSON.stringify({ links }),
      });
    });

    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async () => undefined,
        },
      });
    });

    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.getByTestId('view-settings').click();
    await expect(page).toHaveURL(`/cities/${CITY_A_ID}/settings`);
    await expect(page.getByTestId('city-join-links')).toBeVisible();
    await expect(page.getByTestId('join-link-volunteer')).toContainText(
      'יש קישור הצטרפות קבוע פעיל.'
    );
    await expect(page.getByTestId('join-link-url-volunteer')).toHaveCount(0);

    await page.getByTestId('regenerate-join-link-volunteer').click();
    await expect(
      page.getByText('לחדש את קישור ההצטרפות? הקישור הנוכחי יפסיק לעבוד.')
    ).toBeVisible();
    await expect.poll(() => regenerations).toHaveLength(0);

    await page.getByTestId('confirm-regenerate-join-link-volunteer').click();
    await expect(page.getByTestId('join-link-url-volunteer')).toHaveValue(
      HOLON_VOLUNTEER_URL
    );
    await expect.poll(() => regenerations).toEqual(['volunteer']);

    await page.getByTestId('copy-join-link-volunteer').click();
    await expect(page.getByTestId('join-link-copied-volunteer')).toBeVisible();
  });

  test('does not show a remembered Holon URL after another coordinator regenerated it', async ({
    page,
  }) => {
    await page.addInitScript((key: string) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          url: 'http://localhost:3000/join/fake-holon-volunteer-token',
          createdAt: '2026-10-31T12:00:00.000Z',
        })
      );
    }, `giving-day.join-link-url:${CITY_A_ID}:volunteer`);

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

    await page.route('**/api/cities/*/settings', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
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
        }),
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

    await page.goto(`/cities/${CITY_A_ID}/settings`);
    await expect(page.getByTestId('join-link-volunteer')).toContainText(
      'יש קישור הצטרפות קבוע פעיל.'
    );
    await expect(page.getByTestId('join-link-url-volunteer')).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(
          (key) => window.localStorage.getItem(key),
          `giving-day.join-link-url:${CITY_A_ID}:volunteer`
        )
      )
      .toBeNull();
  });

  test('clears remembered Holon join links on logout', async ({ page }) => {
    await page.addInitScript((key: string) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          url: 'http://localhost:3000/join/fake-holon-volunteer-token',
          createdAt: '2026-10-01T09:00:00.000Z',
        })
      );
    }, `giving-day.join-link-url:${CITY_A_ID}:volunteer`);

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

    await page.route('**/api/auth/logout', async (route) => {
      await route.fulfill({ status: 204 });
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
    await expect
      .poll(() =>
        page.evaluate(
          (key) => window.localStorage.getItem(key),
          `giving-day.join-link-url:${CITY_A_ID}:volunteer`
        )
      )
      .not.toBeNull();

    await page.getByRole('button', { name: 'התנתקות' }).click();
    await expect(page.getByTestId('login-page')).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() =>
          Object.keys(window.localStorage).filter((key) =>
            key.startsWith('giving-day.join-link-url:')
          )
        )
      )
      .toEqual([]);
  });

  test('volunteer cannot see city join links', async ({ page }) => {
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
    await expect(page.getByTestId('city-join-links')).toHaveCount(0);
    await expect(page.getByTestId('city-settings-form')).toHaveCount(0);
  });
});
