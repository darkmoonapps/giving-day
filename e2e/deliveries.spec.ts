import { expect, test } from '@playwright/test';
import { stubAuthenticatedSession, stubDistributionDayApi } from './auth-stubs';

const CITY_A_ID = '11111111-1111-4111-8111-111111111111';
const DAY_ID = '33333333-3333-4333-8333-333333333333';
const DELIVERY_UNASSIGNED_ID = '17171717-1717-4171-8171-171717171717';

test.describe('Distribution day deliveries', () => {
  test('confirmed volunteer sees assigned elders', async ({ page }) => {
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
      myParticipation: {
        id: '44444444-4444-4444-8444-444444444444',
        cityId: CITY_A_ID,
        dayId: DAY_ID,
        volunteerId: '11111111-1111-4111-8111-111111111111',
        status: 'confirmed',
        respondedAt: '2026-10-29T10:00:00.000Z',
        cancelReason: null,
      },
      volunteerDeliveries: [
        {
          id: '16161616-1616-4161-8161-161616161616',
          cityId: CITY_A_ID,
          dayId: DAY_ID,
          status: 'assigned',
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
            contacts: [
              {
                name: 'Tamar Levi',
                relation: 'child',
                phone: '+972506666666',
                isPrimary: true,
              },
            ],
          },
        },
      ],
    });

    await page.goto(`/cities/${CITY_A_ID}/days/${DAY_ID}/deliveries`);
    await expect(page.getByTestId('volunteer-deliveries-page')).toBeVisible();
    await expect(page.getByText('Rivkah Levi')).toBeVisible();
    await expect(page.getByText('12 Example St 12')).toBeVisible();
    await expect(page.getByTestId('elder-next-of-kin')).toBeVisible();
    await expect(page.getByText('Tamar Levi')).toBeVisible();
    await expect(page.getByText('+972506666666')).toBeVisible();
  });

  test('coordinator assigns an unassigned delivery', async ({ page }) => {
    const assigned: Record<string, unknown>[] = [];
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
      onAssign: (body) => assigned.push(body),
      coordinatorDeliveries: [
        {
          id: DELIVERY_UNASSIGNED_ID,
          cityId: CITY_A_ID,
          dayId: DAY_ID,
          status: 'unassigned',
          volunteerId: null,
          matchId: '15151515-1515-4151-8151-151515151515',
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

    await page.goto(`/cities/${CITY_A_ID}/days/${DAY_ID}/deliveries`);
    await expect(page.getByTestId('coordinator-deliveries-page')).toBeVisible();
    await expect(page.getByText('Yosef Abraham')).toBeVisible();
    await page
      .getByTestId('delivery-row-unassigned')
      .locator('select')
      .selectOption('99999999-9999-4999-8999-999999999999');
    await expect
      .poll(() => assigned)
      .toEqual([{ volunteerId: '99999999-9999-4999-8999-999999999999' }]);
  });

  test('coordinator assign dropdown lists confirmed volunteers only', async ({
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
      assignableVolunteers: [
        {
          id: '99999999-9999-4999-8999-999999999999',
          firstName: 'Dana',
          lastName: 'Levi',
        },
      ],
      coordinatorDeliveries: [
        {
          id: DELIVERY_UNASSIGNED_ID,
          cityId: CITY_A_ID,
          dayId: DAY_ID,
          status: 'unassigned',
          volunteerId: null,
          matchId: '15151515-1515-4151-8151-151515151515',
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
      ],
    });

    await page.goto(`/cities/${CITY_A_ID}/days/${DAY_ID}/deliveries`);
    await expect(page.getByTestId('coordinator-deliveries-page')).toBeVisible();

    const unassignedOptions = page
      .getByTestId('delivery-row-unassigned')
      .locator('select option');
    await expect(unassignedOptions).toHaveText(['ללא שיבוץ', 'Dana Levi']);

    const assignedSelect = page
      .getByTestId('delivery-row-assigned')
      .locator('select');
    await expect(assignedSelect).toHaveValue(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    );
    await expect(assignedSelect.locator('option')).toHaveText([
      'ללא שיבוץ',
      'Dana Levi',
      'Yonatan Bar',
    ]);
  });

  test('coordinator sees unmatched elders as needing a volunteer in Hebrew and English', async ({
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
      coordinatorDeliveries: [
        {
          id: '18181818-1818-4181-8181-181818181818',
          cityId: CITY_A_ID,
          dayId: DAY_ID,
          status: 'unassigned',
          volunteerId: null,
          matchId: null,
          assignedAt: null,
          volunteer: null,
          elder: {
            id: '19191919-1919-4191-8191-191919191919',
            fullName: 'Miriam Cohen',
            street: '8 Weizmann St',
            houseNumber: '8',
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

    await page.goto(`/cities/${CITY_A_ID}/days/${DAY_ID}/deliveries`);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByTestId('coordinator-deliveries-page')).toBeVisible();
    await expect(page.getByText('Miriam Cohen')).toBeVisible();
    await expect(page.getByTestId('delivery-row-unassigned')).toBeVisible();
    await expect(page.getByTestId('needs-volunteer-badge')).toHaveText(
      'צריך מתנדב/ת'
    );

    await page.getByRole('button', { name: 'English' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByTestId('needs-volunteer-badge')).toHaveText(
      'Needs a volunteer'
    );
    await expect(page.getByTestId('needs-volunteer-count')).toContainText(
      'need a volunteer'
    );
  });
});
