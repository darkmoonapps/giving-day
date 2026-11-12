import { expect, test, type Page } from '@playwright/test';
import { stubAuthenticatedSession } from './auth-stubs';

const CITY_A_ID = '11111111-1111-4111-8111-111111111111';
const DAY_ID = '33333333-3333-4333-8333-333333333333';

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

async function stubCreateDayApi(
  page: Page,
  opens: Record<string, unknown>[]
): Promise<void> {
  let published: Record<string, unknown> | null = null;

  await page.route(`**/api/cities/${CITY_A_ID}/settings`, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(holonSettings),
    });
  });

  await page.route('**/api/cities/*/distribution-days', async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      const raw = request.postData();
      const body =
        raw === null || raw.length === 0
          ? {}
          : (JSON.parse(raw) as Record<string, unknown>);
      opens.push(body);
      published = {
        id: DAY_ID,
        cityId: CITY_A_ID,
        date: body.date,
        startTime:
          typeof body.startTime === 'string' && body.startTime.length === 5
            ? `${body.startTime}:00`
            : body.startTime,
        endTime:
          typeof body.endTime === 'string' && body.endTime.length === 5
            ? `${body.endTime}:00`
            : body.endTime,
        notesForVolunteers: body.notesForVolunteers ?? null,
        internalNotes: body.internalNotes ?? null,
        addOns: Array.isArray(body.addOns) ? body.addOns : [],
        status: 'published',
        publishedAt: '2026-10-28T09:00:00.000Z',
        closedAt: null,
        createdById: '11111111-1111-4111-8111-111111111111',
      };
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(published),
      });
      return;
    }

    if (request.method() !== 'GET') {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ days: published === null ? [] : [published] }),
    });
  });
}

test.describe('Coordinator create distribution day', () => {
  test('coordinator creates and publishes a Holon day in Hebrew RTL', async ({
    page,
  }) => {
    const opens: Record<string, unknown>[] = [];

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
    await stubCreateDayApi(page, opens);

    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'he');
    await expect(page.getByTestId('create-day')).toBeVisible();
    await page.getByTestId('create-day').click();
    await expect(page).toHaveURL(`/cities/${CITY_A_ID}/days/new`);
    await expect(page.getByTestId('create-day-form')).toBeVisible();
    await expect(page.getByTestId('create-day-center')).toHaveValue(
      '10 Warehouse Rd, Holon'
    );

    await page.getByLabel(/תאריך/).fill('2026-11-15');
    await page.getByLabel(/הערות למתנדבים/).fill('Bring a folding cart');
    await page.getByTestId('create-day-continue').click();

    await expect(page.getByTestId('create-day-review')).toBeVisible();
    await expect(page.getByTestId('create-day-review-center')).toContainText(
      '10 Warehouse Rd, Holon'
    );
    await page.getByTestId('create-day-publish').click();

    await expect(page).toHaveURL('/');
    await expect(page.getByTestId('coordinator-day')).toBeVisible();
    await expect(page.getByTestId('coordinator-day-date')).toContainText('15');
    await expect.poll(() => opens).toHaveLength(1);
    expect(opens[0]).toMatchObject({
      date: '2026-11-15',
      startTime: '09:00',
      endTime: '14:00',
      notesForVolunteers: 'Bring a folding cart',
    });
  });

  test('coordinator creates and publishes a Holon day in English LTR', async ({
    page,
  }) => {
    const opens: Record<string, unknown>[] = [];

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
    await stubCreateDayApi(page, opens);

    await page.goto('/');
    await page.getByRole('button', { name: 'English' }).click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.getByTestId('create-day').click();
    await expect(page.getByTestId('create-day-form')).toBeVisible();
    await expect(page.getByLabel(/Date/)).toBeVisible();
    await expect(page.getByTestId('create-day-center')).toHaveValue(
      '10 Warehouse Rd, Holon'
    );

    await page.getByLabel(/Date/).fill('2026-11-15');
    await page.getByLabel(/Notes for volunteers/).fill('Bring a folding cart');
    await page.getByTestId('create-day-continue').click();

    await expect(page.getByTestId('create-day-review')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Review and publish' })
    ).toBeVisible();
    await page.getByTestId('create-day-publish').click();

    await expect(page).toHaveURL('/');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByTestId('coordinator-day')).toBeVisible();
    await expect(page.getByTestId('coordinator-day-date')).toContainText(
      'November'
    );
    await expect.poll(() => opens).toHaveLength(1);
    expect(opens[0]).toMatchObject({
      date: '2026-11-15',
      startTime: '09:00',
      endTime: '14:00',
    });
  });

  test('volunteer cannot create a distribution day', async ({ page }) => {
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
    await expect(page.getByTestId('create-day')).toHaveCount(0);

    await page.goto(`/cities/${CITY_A_ID}/days/new`);
    await expect(page.getByTestId('create-day-page')).toBeVisible();
    await expect(page.getByTestId('create-day-form')).toHaveCount(0);
  });
});
