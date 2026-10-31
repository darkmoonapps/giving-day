import { describe, expect, it } from 'vitest';
import { volunteerDayRouteSchema } from './route';

const CITY_ID = '11111111-1111-4111-8111-111111111111';
const DAY_ID = '33333333-3333-4333-8333-333333333333';
const ELDER_ID = '12121212-1212-4121-8121-121212121212';
const DELIVERY_ID = '16161616-1616-4161-8161-161616161616';

const elder = {
  id: ELDER_ID,
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

describe('volunteerDayRouteSchema', () => {
  it('accepts a Holon volunteer route with a placed center and mixed stops', () => {
    const payload = {
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
          deliveryId: DELIVERY_ID,
          visitOrder: 1,
          placed: true,
          lat: 32.0188,
          lng: 34.7792,
          status: 'assigned' as const,
          elder,
        },
        {
          deliveryId: '17171717-1717-4171-8171-171717171717',
          visitOrder: null,
          placed: false,
          lat: null,
          lng: null,
          status: 'assigned' as const,
          elder: {
            ...elder,
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
          },
        },
      ],
    };

    expect(volunteerDayRouteSchema.parse(payload)).toEqual(payload);
  });

  it('rejects a zero visit order', () => {
    expect(
      volunteerDayRouteSchema.safeParse({
        dayId: DAY_ID,
        cityId: CITY_ID,
        cityNameHe: 'חולון',
        cityNameEn: 'Holon',
        center: {
          address: '10 Warehouse Rd, Holon',
          lat: null,
          lng: null,
          placed: false,
        },
        stops: [
          {
            deliveryId: DELIVERY_ID,
            visitOrder: 0,
            placed: false,
            lat: null,
            lng: null,
            status: 'assigned',
            elder,
          },
        ],
      }).success
    ).toBe(false);
  });
});
