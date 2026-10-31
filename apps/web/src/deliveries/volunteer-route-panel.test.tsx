import { afterEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { VolunteerDayRoute } from '@giving-day/shared';
import { i18n } from '../i18n';
import { renderWithProviders } from '../test/render';
import { VolunteerRoutePanel } from './volunteer-route-panel';

const CITY_ID = '11111111-1111-4111-8111-111111111111';
const DAY_ID = '33333333-3333-4333-8333-333333333333';

const holonRoute: VolunteerDayRoute = {
  dayId: DAY_ID,
  cityId: CITY_ID,
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
      deliveryId: '17171717-1717-4171-8171-171717171717',
      visitOrder: null,
      placed: false,
      lat: null,
      lng: null,
      status: 'assigned',
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
};

describe('VolunteerRoutePanel', () => {
  afterEach(async () => {
    await i18n.changeLanguage('he');
  });

  it('lists Holon stops in suggested order with Navigate menus', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <VolunteerRoutePanel
        route={holonRoute}
        cityName="Holon"
        loadError={false}
      />
    );

    expect(screen.getByTestId('volunteer-route-panel')).toBeInTheDocument();
    expect(screen.getByTestId('volunteer-route-map')).toBeInTheDocument();
    const stops = screen.getAllByTestId('volunteer-route-stop');
    expect(stops).toHaveLength(2);
    expect(stops[0]).toHaveTextContent('Rivkah Levi');
    expect(stops[0]?.getAttribute('data-placed')).toBe('true');
    expect(stops[1]).toHaveTextContent('Yosef Abraham');
    expect(
      screen.getByTestId('volunteer-route-stop-unplaced')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('volunteer-route-unplaced-hint')
    ).toBeInTheDocument();

    await user.click(screen.getByTestId('route-navigate-center-menu'));
    expect(
      screen.getByTestId('route-navigate-center-menu-google')
    ).toHaveAttribute(
      'href',
      expect.stringContaining(encodeURIComponent('10 Warehouse Rd, Holon'))
    );
  });

  it('renders English copy in LTR', async () => {
    await i18n.changeLanguage('en');
    renderWithProviders(
      <VolunteerRoutePanel
        route={holonRoute}
        cityName="Holon"
        loadError={false}
      />
    );

    expect(screen.getByText('Suggested route')).toBeInTheDocument();
    expect(screen.getByText('Distribution center')).toBeInTheDocument();
    expect(screen.getByText('Stop 1')).toBeInTheDocument();
    expect(screen.getByText('Not on the map')).toBeInTheDocument();
  });

  it('shows a list-only fallback when the route cannot load', () => {
    renderWithProviders(
      <VolunteerRoutePanel route={undefined} cityName="Holon" loadError />
    );

    expect(screen.getByTestId('volunteer-route-error')).toBeInTheDocument();
    expect(screen.queryByTestId('volunteer-route-map')).not.toBeInTheDocument();
  });
});
