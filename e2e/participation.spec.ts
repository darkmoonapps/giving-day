import { expect, test } from '@playwright/test';
import { stubAuthenticatedSession, stubDistributionDayApi } from './auth-stubs';

const CITY_A_ID = '11111111-1111-4111-8111-111111111111';
const DAY_ID = '33333333-3333-4333-8333-333333333333';

test.describe('Volunteer confirm and coordinator responses', () => {
  test('volunteer confirms an open day from home', async ({ page }) => {
    const posted: Record<string, unknown>[] = [];
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
    await stubDistributionDayApi(page, {
      onRespond: (body) => posted.push(body),
    });

    await page.goto('/');
    await expect(page.getByTestId('home-page')).toBeVisible();
    await expect(page.getByTestId('volunteer-open-days')).toBeVisible();
    await page.getByRole('button', { name: 'למענה' }).click();

    await expect(page.getByTestId('volunteer-day-page')).toBeVisible();
    await page.getByTestId('confirm-participation').click();
    await expect(page.getByTestId('fireworks-thank-you')).toBeVisible();
    await expect(page.getByTestId('fireworks-thank-you')).toHaveAttribute(
      'data-thank-you-reason',
      'confirmed'
    );
    await page.getByTestId('thank-you-continue').click();
    await expect(page.getByTestId('fireworks-thank-you')).toHaveCount(0);
    await expect(page.getByTestId('confirm-thanks')).toBeVisible();
    expect(posted).toEqual([{ status: 'confirmed' }]);
  });

  test('coordinator sees volunteer response statuses including a decline reason', async ({
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
    await stubDistributionDayApi(page, {
      responses: [
        {
          volunteerId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          firstName: 'Yonatan',
          lastName: 'Bar',
          responseStatus: 'confirmed',
          cancelReason: null,
          respondedAt: '2026-10-29T10:00:00.000Z',
        },
        {
          volunteerId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
          firstName: 'Maya',
          lastName: 'Cohen',
          responseStatus: 'declined',
          cancelReason: 'Out of town',
          respondedAt: '2026-10-29T11:00:00.000Z',
        },
        {
          volunteerId: '99999999-9999-4999-8999-999999999999',
          firstName: 'Dana',
          lastName: 'Levi',
          responseStatus: 'no_response',
          cancelReason: null,
          respondedAt: null,
        },
      ],
    });

    await page.goto(`/cities/${CITY_A_ID}/days/${DAY_ID}/responses`);
    await expect(page.getByTestId('coordinator-responses-page')).toBeVisible();
    await expect(page.getByText('Yonatan Bar')).toBeVisible();
    await expect(page.getByText('Out of town')).toBeVisible();
    await expect(page.getByText('Dana Levi')).toBeVisible();
  });
});
