import { expect, test } from '@playwright/test';
import { stubAuthenticatedSession, stubDistributionDayApi } from './auth-stubs';

const CITY_A_ID = '11111111-1111-4111-8111-111111111111';
const DAY_ID = '33333333-3333-4333-8333-333333333333';

test.describe('Coordinator distribution-day dashboard', () => {
  test('opens the day dashboard from home and links to needs a volunteer', async ({
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
          cancelReason: 'Family event in Holon',
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
      coordinatorDeliveries: [
        {
          id: '16161616-1616-4161-8161-161616161616',
          cityId: CITY_A_ID,
          dayId: DAY_ID,
          status: 'assigned',
          volunteerId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          matchId: '14141414-1414-4141-8141-141414141414',
          assignedAt: '2026-10-28T09:00:00.000Z',
          volunteer: {
            id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            firstName: 'Yonatan',
            lastName: 'Bar',
          },
          elder: {
            id: '12121212-1212-4121-8121-121212121212',
            fullName: 'Rivkah Levi',
            street: '12 Example St',
            houseNumber: '12',
            entrance: 'B',
            floor: '3',
            apartment: '7',
            addressNotes: 'Knock loudly',
            notes: 'Entrance is around the back',
            contacts: [],
          },
        },
        {
          id: '17171717-1717-4171-8171-171717171717',
          cityId: CITY_A_ID,
          dayId: DAY_ID,
          status: 'unassigned',
          volunteerId: null,
          matchId: null,
          assignedAt: null,
          volunteer: null,
          elder: {
            id: '13131313-1313-4131-8131-131313131313',
            fullName: 'Yosef Abraham',
            street: '4 Park Ave',
            houseNumber: '4',
            entrance: null,
            floor: null,
            apartment: null,
            addressNotes: null,
            notes: null,
            contacts: [],
          },
        },
      ],
    });

    await page.goto('/');
    await expect(page.getByTestId('home-page')).toBeVisible();
    await expect(page.getByTestId('coordinator-days')).toBeVisible();
    await page.getByTestId('view-dashboard').click();

    await expect(page.getByTestId('coordinator-dashboard-page')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByTestId('dashboard-stat-volunteers')).toContainText(
      '3'
    );
    await expect(page.getByTestId('dashboard-stat-confirmed')).toContainText(
      '1'
    );
    await expect(page.getByTestId('dashboard-stat-pending')).toContainText('1');
    await expect(page.getByTestId('dashboard-stat-declined')).toContainText(
      '1'
    );
    await expect(page.getByText('Yonatan Bar')).toBeVisible();
    await expect(page.getByText('Dana Levi')).toBeVisible();
    await expect(page.getByText('Maya Cohen')).toBeVisible();
    await expect(page.getByTestId('dashboard-cancel-reason')).toHaveText(
      'Family event in Holon'
    );
    await expect(page.getByText('Yosef Abraham')).toBeVisible();

    await page.getByRole('button', { name: 'English' }).click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByTestId('coordinator-dashboard-page')).toContainText(
      'Distribution day dashboard'
    );

    await page.getByTestId('dashboard-needs-volunteer-link').click();
    await expect(page.getByTestId('coordinator-deliveries-page')).toBeVisible();
    await expect(page.getByTestId('filter-status')).toHaveValue('unassigned');
    await expect(page.getByText('Yosef Abraham')).toBeVisible();
  });
});
