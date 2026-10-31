import { expect, test, type Page } from '@playwright/test';
import { stubAuthenticatedSession, stubDistributionDayApi } from './auth-stubs';

const CITY_A_ID = '11111111-1111-4111-8111-111111111111';
const DAY_ID = '33333333-3333-4333-8333-333333333333';

const EMPTY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

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
  street: '',
  houseNumber: '',
  entrance: null,
  floor: null,
  apartment: null,
  addressNotes: null,
  notes: null,
  contacts: [],
};

function isOsmTileUrl(url: URL): boolean {
  return (
    url.protocol === 'https:' &&
    (url.hostname === 'tile.openstreetmap.org' ||
      url.hostname.endsWith('.tile.openstreetmap.org'))
  );
}

function isNominatimUrl(url: URL): boolean {
  return (
    url.protocol === 'https:' && url.hostname === 'nominatim.openstreetmap.org'
  );
}

async function stubMapNetwork(page: Page): Promise<void> {
  await page.route(isOsmTileUrl, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: EMPTY_PNG,
    });
  });
  await page.route(isNominatimUrl, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });
}

test.describe('Volunteer optimized route map', () => {
  test('shows a numbered Holon route and reuses Navigate on each stop', async ({
    page,
  }) => {
    await stubMapNetwork(page);
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
          elder: yosefElder,
        },
      ],
      volunteerRoute: {
        dayId: DAY_ID,
        cityId: CITY_A_ID,
        cityNameHe: 'חולון',
        cityNameEn: 'Holon',
        center: {
          address: '10 Warehouse Rd, Holon',
          lat: 32.0114,
          lng: 34.7748,
          placed: true,
        },
        stops: [
          {
            deliveryId: '16161616-1616-4161-8161-161616161616',
            visitOrder: 1,
            placed: true,
            lat: 32.0188,
            lng: 34.7792,
            status: 'assigned',
            elder: rivkahElder,
          },
          {
            deliveryId: '17171717-1717-4171-8171-171717171717',
            visitOrder: null,
            placed: false,
            lat: null,
            lng: null,
            status: 'assigned',
            elder: yosefElder,
          },
        ],
      },
    });

    await page.goto(`/cities/${CITY_A_ID}/days/${DAY_ID}/deliveries`);
    await expect(page.getByTestId('volunteer-deliveries-page')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByTestId('volunteer-route-panel')).toBeVisible();
    await expect(page.getByTestId('volunteer-route-map')).toBeVisible();

    const stops = page.getByTestId('volunteer-route-stop');
    await expect(stops).toHaveCount(2);
    await expect(stops.nth(0)).toContainText('Rivkah Levi');
    await expect(
      stops.nth(0).getByTestId('volunteer-route-stop-number')
    ).toBeVisible();
    await expect(stops.nth(1)).toContainText('Yosef Abraham');
    await expect(
      stops.nth(1).getByTestId('volunteer-route-stop-unplaced')
    ).toBeVisible();
    await expect(page.getByText('Miriam Cohen')).toHaveCount(0);

    await page.getByTestId('route-navigate-center-menu').click();
    await expect(
      page.getByTestId('route-navigate-center-menu-google')
    ).toHaveAttribute(
      'href',
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent('10 Warehouse Rd, Holon')}`
    );
    await expect(
      page.getByTestId('route-navigate-center-menu-apple')
    ).toHaveAttribute(
      'href',
      `https://maps.apple.com/?daddr=${encodeURIComponent('10 Warehouse Rd, Holon')}`
    );
    await expect(
      page.getByTestId('route-navigate-center-menu-waze')
    ).toHaveAttribute(
      'href',
      `https://waze.com/ul?q=${encodeURIComponent('10 Warehouse Rd, Holon')}&navigate=yes`
    );
    await page.keyboard.press('Escape');

    await stops.nth(0).getByTestId('route-navigate-menu').click();
    await expect(
      page.getByTestId('route-navigate-menu-google')
    ).toHaveAttribute(
      'href',
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent('12 Example St 12, חולון')}`
    );
    await expect(page.getByTestId('route-navigate-menu-apple')).toBeVisible();
    await expect(page.getByTestId('route-navigate-menu-waze')).toBeVisible();
  });
});
