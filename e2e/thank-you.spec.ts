import { expect, test } from '@playwright/test';
import { stubAuthenticatedSession, stubDistributionDayApi } from './auth-stubs';

const CITY_A_ID = '11111111-1111-4111-8111-111111111111';
const DAY_ID = '33333333-3333-4333-8333-333333333333';

const rivkahElder = {
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
      relation: 'child' as const,
      phone: '+972506666666',
      isPrimary: true,
    },
  ],
};

const yosefElder = {
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
};

const confirmedParticipation = {
  id: '44444444-4444-4444-8444-444444444444',
  cityId: CITY_A_ID,
  dayId: DAY_ID,
  volunteerId: '11111111-1111-4111-8111-111111111111',
  status: 'confirmed',
  respondedAt: '2026-10-29T10:00:00.000Z',
  cancelReason: null,
};

test.describe('Volunteer fireworks thank-you', () => {
  test('shows fireworks after confirm and not after decline', async ({
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
    await stubDistributionDayApi(page);

    await page.goto(`/cities/${CITY_A_ID}/days/${DAY_ID}`);
    await expect(page.getByTestId('volunteer-day-page')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    await page.getByTestId('decline-participation').click();
    await page.getByLabel('סיבה').fill('Family event in Holon');
    await page.getByTestId('submit-decline').click();
    await expect(page.getByTestId('decline-thanks')).toBeVisible();
    await expect(page.getByTestId('fireworks-thank-you')).toHaveCount(0);

    await page.getByRole('button', { name: 'אוכל להגיע בכל זאת' }).click();
    await expect(page.getByTestId('fireworks-thank-you')).toBeVisible();
    await expect(page.getByTestId('fireworks-thank-you')).toHaveAttribute(
      'data-thank-you-reason',
      'confirmed'
    );
    await page.getByTestId('thank-you-continue').click();
    await expect(page.getByTestId('fireworks-thank-you')).toHaveCount(0);
    await expect(page.getByTestId('confirm-thanks')).toBeVisible();
  });

  test('shows fireworks after every assigned package has a final status', async ({
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
    await stubDistributionDayApi(page, {
      myParticipation: confirmedParticipation,
      volunteerDeliveries: [
        {
          id: '16161616-1616-4161-8161-161616161616',
          cityId: CITY_A_ID,
          dayId: DAY_ID,
          status: 'picked',
          note: null,
          notDeliveredReason: null,
          elder: rivkahElder,
        },
      ],
    });

    await page.goto(`/cities/${CITY_A_ID}/days/${DAY_ID}/deliveries`);
    await expect(page.getByTestId('volunteer-deliveries-page')).toBeVisible();
    await expect(page.getByTestId('fireworks-thank-you')).toHaveCount(0);

    await page.getByTestId('mark-delivered').click();
    await expect(page.getByTestId('fireworks-thank-you')).toBeVisible();
    await expect(page.getByTestId('fireworks-thank-you')).toHaveAttribute(
      'data-thank-you-reason',
      'finished'
    );
    await page.getByTestId('thank-you-continue').click();
    await expect(page.getByTestId('fireworks-thank-you')).toHaveCount(0);
  });

  test('does not show fireworks after a partial delivery update', async ({
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
    await stubDistributionDayApi(page, {
      myParticipation: confirmedParticipation,
      volunteerDeliveries: [
        {
          id: '16161616-1616-4161-8161-161616161616',
          cityId: CITY_A_ID,
          dayId: DAY_ID,
          status: 'picked',
          note: null,
          notDeliveredReason: null,
          elder: rivkahElder,
        },
        {
          id: '17171717-1717-4171-8171-171717171717',
          cityId: CITY_A_ID,
          dayId: DAY_ID,
          status: 'assigned',
          note: null,
          notDeliveredReason: null,
          elder: yosefElder,
        },
      ],
    });

    await page.goto(`/cities/${CITY_A_ID}/days/${DAY_ID}/deliveries`);
    await expect(
      page
        .getByTestId('volunteer-delivery-card')
        .filter({ hasText: 'Yosef Abraham' })
    ).toBeVisible();
    await page.getByTestId('mark-delivered').click();
    await expect(page.getByTestId('mark-picked')).toBeVisible();
    await expect(page.getByTestId('fireworks-thank-you')).toHaveCount(0);
  });
});
