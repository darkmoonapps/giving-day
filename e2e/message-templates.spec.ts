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

const holonDayInviteHe = {
  id: null,
  key: 'day_invite',
  locale: 'he',
  title: 'יום חלוקה',
  body: 'האם תוכל/י לחלק ב-{{date}} בין {{startTime}} ל-{{endTime}}?',
  defaultTitle: 'יום חלוקה',
  defaultBody: 'האם תוכל/י לחלק ב-{{date}} בין {{startTime}} ל-{{endTime}}?',
  isCustom: false,
  placeholders: ['date', 'startTime', 'endTime'],
};

const holonDayInviteEn = {
  id: null,
  key: 'day_invite',
  locale: 'en',
  title: 'Distribution day',
  body: 'Can you deliver on {{date}} from {{startTime}} to {{endTime}}?',
  defaultTitle: 'Distribution day',
  defaultBody: 'Can you deliver on {{date}} from {{startTime}} to {{endTime}}?',
  isCustom: false,
  placeholders: ['date', 'startTime', 'endTime'],
};

const holonConfirmReminderHe = {
  id: null,
  key: 'confirm_reminder',
  locale: 'he',
  title: 'תזכורת לאישור',
  body: 'עדיין לא עניתם על יום החלוקה ב-{{date}} ({{startTime}}–{{endTime}}). אנא אשרו או דחו.',
  defaultTitle: 'תזכורת לאישור',
  defaultBody:
    'עדיין לא עניתם על יום החלוקה ב-{{date}} ({{startTime}}–{{endTime}}). אנא אשרו או דחו.',
  isCustom: false,
  placeholders: ['date', 'startTime', 'endTime'],
};

const holonConfirmReminderEn = {
  id: null,
  key: 'confirm_reminder',
  locale: 'en',
  title: 'Confirmation reminder',
  body: 'You have not responded for {{date}} ({{startTime}}–{{endTime}}). Please confirm or decline.',
  defaultTitle: 'Confirmation reminder',
  defaultBody:
    'You have not responded for {{date}} ({{startTime}}–{{endTime}}). Please confirm or decline.',
  isCustom: false,
  placeholders: ['date', 'startTime', 'endTime'],
};

test.describe('Coordinator message templates', () => {
  test('coordinator opens Holon settings and saves a Hebrew day-invite template', async ({
    page,
  }) => {
    const puts: Record<string, unknown>[] = [];
    let templates = {
      templates: [holonDayInviteHe, holonDayInviteEn],
    };

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
              active: false,
              createdAt: null,
              usedCount: 0,
            },
          ],
        }),
      });
    });

    await page.route('**/api/cities/*/settings', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(holonSettings),
        });
        return;
      }
      await route.fallback();
    });

    await page.route('**/api/cities/*/message-templates**', async (route) => {
      const request = route.request();
      const url = request.url();

      if (
        request.method() === 'PUT' &&
        url.includes('/message-templates/day_invite/he')
      ) {
        const raw = request.postData();
        const body =
          raw === null || raw.length === 0
            ? {}
            : (JSON.parse(raw) as Record<string, unknown>);
        puts.push(body);
        const next = {
          ...holonDayInviteHe,
          id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
          title: String(body.title ?? ''),
          body: String(body.body ?? ''),
          isCustom: true,
        };
        templates = {
          templates: templates.templates.map((template) =>
            template.key === 'day_invite' && template.locale === 'he'
              ? next
              : template
          ),
        };
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(next),
        });
        return;
      }

      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(templates),
        });
        return;
      }

      await route.fallback();
    });

    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.getByTestId('view-settings').click();
    await expect(page).toHaveURL(`/cities/${CITY_A_ID}/settings`);
    await expect(page.getByTestId('city-message-templates')).toBeVisible();
    await expect(
      page.getByTestId('message-template-day_invite-he')
    ).toBeVisible();
    await expect(
      page.getByTestId('template-placeholders-day_invite')
    ).toContainText('{{date}}');

    await page
      .getByTestId('message-template-day_invite-he')
      .locator('input[name="title"]')
      .fill('יום חלוקה בחולון');
    await page.getByTestId('save-message-template-day_invite').click();
    await expect(
      page.getByTestId('message-template-success-day_invite')
    ).toBeVisible();
    await expect.poll(() => puts).toHaveLength(1);
    expect(puts[0]).toMatchObject({
      title: 'יום חלוקה בחולון',
    });
  });

  test('coordinator saves a Hebrew confirm-reminder template for Holon', async ({
    page,
  }) => {
    const puts: Record<string, unknown>[] = [];
    let templates = {
      templates: [
        holonDayInviteHe,
        holonDayInviteEn,
        holonConfirmReminderHe,
        holonConfirmReminderEn,
      ],
    };

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
              active: false,
              createdAt: null,
              usedCount: 0,
            },
          ],
        }),
      });
    });

    await page.route('**/api/cities/*/settings', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(holonSettings),
        });
        return;
      }
      await route.fallback();
    });

    await page.route('**/api/cities/*/message-templates**', async (route) => {
      const request = route.request();
      const url = request.url();

      if (
        request.method() === 'PUT' &&
        url.includes('/message-templates/confirm_reminder/he')
      ) {
        const raw = request.postData();
        const body =
          raw === null || raw.length === 0
            ? {}
            : (JSON.parse(raw) as Record<string, unknown>);
        puts.push(body);
        const next = {
          ...holonConfirmReminderHe,
          id: 'f1f1f1f1-f1f1-4f1f-8f1f-f1f1f1f1f1f1',
          title: String(body.title ?? ''),
          body: String(body.body ?? ''),
          isCustom: true,
        };
        templates = {
          templates: templates.templates.map((template) =>
            template.key === 'confirm_reminder' && template.locale === 'he'
              ? next
              : template
          ),
        };
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(next),
        });
        return;
      }

      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(templates),
        });
        return;
      }

      await route.fallback();
    });

    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.getByTestId('view-settings').click();
    await expect(page).toHaveURL(`/cities/${CITY_A_ID}/settings`);
    await expect(page.getByTestId('city-message-templates')).toBeVisible();
    await expect(
      page.getByTestId('message-template-confirm_reminder-he')
    ).toBeVisible();
    await expect(
      page.getByTestId('template-placeholders-confirm_reminder')
    ).toContainText('{{date}}');

    await page
      .getByTestId('message-template-confirm_reminder-he')
      .locator('input[name="title"]')
      .fill('תזכורת לחולון');
    await page.getByTestId('save-message-template-confirm_reminder').click();
    await expect(
      page.getByTestId('message-template-success-confirm_reminder')
    ).toBeVisible();
    await expect.poll(() => puts).toHaveLength(1);
    expect(puts[0]).toMatchObject({
      title: 'תזכורת לחולון',
    });
  });

  test('volunteer cannot open message templates on city settings', async ({
    page,
  }) => {
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

    await page.goto(`/cities/${CITY_A_ID}/settings`);
    await expect(page.getByTestId('city-settings-page')).toBeVisible();
    await expect(page.getByTestId('city-message-templates')).toHaveCount(0);
  });
});
