import { describe, expect, it } from 'vitest';
import type { VolunteerDayRoute, VolunteerDelivery } from '@giving-day/shared';
import { applyRouteOrder, routeMetaByDeliveryId } from './apply-route-order';

const CITY_ID = '11111111-1111-4111-8111-111111111111';
const DAY_ID = '33333333-3333-4333-8333-333333333333';

const rivkah: VolunteerDelivery = {
  id: '16161616-1616-4161-8161-161616161616',
  cityId: CITY_ID,
  dayId: DAY_ID,
  status: 'assigned',
  note: null,
  notDeliveredReason: null,
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
};

const yosef: VolunteerDelivery = {
  ...rivkah,
  id: '17171717-1717-4171-8171-171717171717',
  elder: {
    ...rivkah.elder,
    id: '13131313-1313-4131-8131-131313131313',
    fullName: 'Yosef Abraham',
    street: '4 Park Ave',
    houseNumber: '4',
    entrance: null,
    floor: null,
    apartment: null,
    addressNotes: null,
    notes: null,
  },
};

const route: VolunteerDayRoute = {
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
      deliveryId: yosef.id,
      visitOrder: 1,
      placed: true,
      lat: 32.026,
      lng: 34.79,
      status: 'assigned',
      elder: yosef.elder,
    },
    {
      deliveryId: rivkah.id,
      visitOrder: null,
      placed: false,
      lat: null,
      lng: null,
      status: 'assigned',
      elder: rivkah.elder,
    },
  ],
};

describe('applyRouteOrder', () => {
  it('reorders Holon deliveries to the suggested visit order', () => {
    expect(
      applyRouteOrder([rivkah, yosef], route).map((row) => row.id)
    ).toEqual([yosef.id, rivkah.id]);
  });

  it('keeps the original list when no route is loaded', () => {
    expect(applyRouteOrder([rivkah, yosef], undefined)).toEqual([
      rivkah,
      yosef,
    ]);
  });
});

describe('routeMetaByDeliveryId', () => {
  it('exposes visit order and unplaced flags', () => {
    const meta = routeMetaByDeliveryId(route);
    expect(meta.get(yosef.id)).toEqual({ visitOrder: 1, placed: true });
    expect(meta.get(rivkah.id)).toEqual({ visitOrder: null, placed: false });
  });
});
