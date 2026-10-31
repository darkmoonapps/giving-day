import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import type { VolunteerDayRoute } from '@giving-day/shared';
import { renderWithProviders } from '../test/render';
import { VolunteerRouteMap } from './volunteer-route-map';

const leafletMocks = vi.hoisted(() => {
  const bindPopup = vi.fn(function (this: unknown) {
    return this;
  });
  const addTo = vi.fn(function (this: unknown) {
    return this;
  });
  const marker = vi.fn(() => ({ addTo, bindPopup }));
  return {
    bindPopup,
    marker,
    L: {
      map: vi.fn(() => ({
        remove: vi.fn(),
        setView: vi.fn(),
        fitBounds: vi.fn(),
      })),
      tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
      marker,
      divIcon: vi.fn(() => ({})),
      polyline: vi.fn(() => ({ addTo: vi.fn() })),
      latLngBounds: vi.fn(() => ({})),
    },
  };
});

vi.mock('leaflet', () => ({
  default: leafletMocks.L,
}));

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
  afterEach(() => {
    leafletMocks.bindPopup.mockClear();
    leafletMocks.marker.mockClear();
  });

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

  it('binds elder names as text so crafted HTML is not executed', async () => {
    const widthDescriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'offsetWidth'
    );
    const heightDescriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'offsetHeight'
    );
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get: (): number => 480,
    });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get: (): number => 320,
    });

    try {
      const payload = '<img src=x onerror=alert(1)>';
      renderWithProviders(
        <VolunteerRouteMap
          route={{
            ...holonRoute,
            center: {
              ...holonRoute.center,
              address: '<script>alert(1)</script>',
            },
            stops: holonRoute.stops.map((stop) => ({
              ...stop,
              elder: { ...stop.elder, fullName: payload },
            })),
          }}
        />
      );

      await waitFor(() => {
        expect(leafletMocks.bindPopup).toHaveBeenCalled();
      });

      const popupNodes = leafletMocks.bindPopup.mock.calls.map(
        (call) => call[0]
      );
      expect(popupNodes).toHaveLength(2);
      for (const node of popupNodes) {
        expect(node).toBeInstanceOf(HTMLElement);
        expect((node as HTMLElement).querySelector('img')).toBeNull();
        expect((node as HTMLElement).querySelector('script')).toBeNull();
      }
      expect((popupNodes[0] as HTMLElement).textContent).toBe(
        '<script>alert(1)</script>'
      );
      expect((popupNodes[1] as HTMLElement).textContent).toBe(payload);
      expect((popupNodes[1] as HTMLElement).innerHTML).not.toContain('<img');
    } finally {
      if (widthDescriptor === undefined) {
        Reflect.deleteProperty(HTMLElement.prototype, 'offsetWidth');
      } else {
        Object.defineProperty(
          HTMLElement.prototype,
          'offsetWidth',
          widthDescriptor
        );
      }
      if (heightDescriptor === undefined) {
        Reflect.deleteProperty(HTMLElement.prototype, 'offsetHeight');
      } else {
        Object.defineProperty(
          HTMLElement.prototype,
          'offsetHeight',
          heightDescriptor
        );
      }
    }
  });
});
