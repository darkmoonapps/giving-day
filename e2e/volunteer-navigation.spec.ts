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

const missingAddressElder = {
  id: '13131313-1313-4131-8131-131313131313',
  fullName: 'Yosef Abraham',
  street: '',
  houseNumber: '',
  entrance: null,
  floor: null,
  apartment: null,
  addressNotes: null,
  notes: null,
  contacts: [],
};

test.describe('Volunteer address navigation', () => {
  test('opens Google Maps, Apple Maps, and Waze from an assigned Holon delivery', async ({
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
          elder: rivkahElder,
        },
        {
          id: '17171717-1717-4171-8171-171717171717',
          cityId: CITY_A_ID,
          dayId: DAY_ID,
          status: 'assigned',
          elder: missingAddressElder,
        },
      ],
    });

    await page.goto(`/cities/${CITY_A_ID}/days/${DAY_ID}/deliveries`);
    await expect(page.getByTestId('volunteer-deliveries-page')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    const encodedElder = encodeURIComponent('12 Example St 12, חולון');
    const encodedCenter = encodeURIComponent('10 Warehouse Rd, Holon');

    await expect(page.getByTestId('navigate-center-menu')).toBeVisible();
    await page.getByTestId('navigate-center-menu').click();
    await expect(
      page.getByTestId('navigate-center-menu-google')
    ).toHaveAttribute(
      'href',
      `https://www.google.com/maps/dir/?api=1&destination=${encodedCenter}`
    );
    await expect(
      page.getByTestId('navigate-center-menu-apple')
    ).toHaveAttribute('href', `https://maps.apple.com/?daddr=${encodedCenter}`);
    await expect(page.getByTestId('navigate-center-menu-waze')).toHaveAttribute(
      'href',
      `https://waze.com/ul?q=${encodedCenter}&navigate=yes`
    );
    await page.keyboard.press('Escape');

    const cards = page.getByTestId('volunteer-delivery-card');
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0).getByTestId('navigate-menu')).toBeVisible();
    await expect(cards.nth(1).getByTestId('navigate-menu')).toHaveCount(0);

    await cards.nth(0).getByTestId('navigate-menu').click();
    const google = page.getByTestId('navigate-menu-google');
    await expect(google).toHaveAttribute(
      'href',
      `https://www.google.com/maps/dir/?api=1&destination=${encodedElder}`
    );
    await expect(page.getByTestId('navigate-menu-apple')).toHaveAttribute(
      'href',
      `https://maps.apple.com/?daddr=${encodedElder}`
    );
    await expect(page.getByTestId('navigate-menu-waze')).toHaveAttribute(
      'href',
      `https://waze.com/ul?q=${encodedElder}&navigate=yes`
    );
    await expect(page.getByTestId('navigate-menu-hints')).toContainText(
      'כניסה B'
    );
    expect(await google.getAttribute('href')).not.toContain('Entrance');
    expect(await google.getAttribute('href')).not.toContain(
      '%D7%9B%D7%A0%D7%99%D7%A1%D7%94'
    );
  });
});
