import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import type { VolunteerDayRoute } from '@giving-day/shared';
import { renderWithProviders } from '../test/render';
import { VolunteerRouteMap } from './volunteer-route-map';

const holonRoute: VolunteerDayRoute = {
  dayId: '33333333-3333-4333-8333-333333333333',
  cityId: '11111111-1111-4111-8111-111111111111',
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
        addressNotes: null,
        notes: null,
        contacts: [],
      },
    },
  ],
};

describe('VolunteerRouteMap', () => {
  it('renders an accessible Holon map container without placing unlocated routes', () => {
    renderWithProviders(<VolunteerRouteMap route={holonRoute} />);
    expect(screen.getByTestId('volunteer-route-map')).toBeInTheDocument();
    expect(screen.getByTestId('volunteer-route-map')).toHaveAttribute(
      'dir',
      'ltr'
    );
  });

  it('hides the map when nothing can be placed', () => {
    renderWithProviders(
      <VolunteerRouteMap
        route={{
          ...holonRoute,
          center: { ...holonRoute.center, lat: null, lng: null, placed: false },
          stops: holonRoute.stops.map((stop) => ({
            ...stop,
            placed: false,
            lat: null,
            lng: null,
          })),
        }}
      />
    );
    expect(screen.queryByTestId('volunteer-route-map')).not.toBeInTheDocument();
  });
});
