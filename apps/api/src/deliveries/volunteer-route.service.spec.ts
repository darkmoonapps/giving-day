import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { AbilityFactory } from '../abilities/ability.factory';
import { GEOCODER } from '../geocoding/geocoding.tokens';
import { PrismaService } from '../prisma/prisma.service';
import {
  CITY_A_ID,
  CITY_B_ID,
  VOLUNTEER_A_ID,
  VOLUNTEER_B_ID,
  volunteerA,
} from '../test/fake-users';
import {
  MAX_LIVE_GEOCODES_PER_REQUEST,
  VolunteerRouteService,
} from './volunteer-route.service';

const DAY_ID = '33333333-3333-4333-8333-333333333333';
const ELDER_RIVKAH_ID = '12121212-1212-4121-8121-121212121212';
const ELDER_YOSEF_ID = '13131313-1313-4131-8131-131313131313';
const DELIVERY_RIVKAH_ID = '16161616-1616-4161-8161-161616161616';
const DELIVERY_YOSEF_ID = '17171717-1717-4171-8171-171717171717';
const HOLON_CENTER = { lat: 32.0114, lng: 34.7748 };
const RIVKAH_COORD = { lat: 32.0188, lng: 34.7792 };

describe('VolunteerRouteService', () => {
  let service: VolunteerRouteService;
  const geocode = vi.fn();

  const publishedDay = {
    id: DAY_ID,
    cityId: CITY_A_ID,
  };

  const rivkahElder = {
    id: ELDER_RIVKAH_ID,
    fullName: 'Rivkah Levi',
    street: '12 Example St',
    houseNumber: '12',
    entrance: 'B',
    floor: '3',
    apartment: '7',
    addressNotes: 'Knock loudly',
    notes: 'Entrance is around the back',
    lat: new Prisma.Decimal('32.018800'),
    lng: new Prisma.Decimal('34.779200'),
    geocodeStatus: 'ok' as const,
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
    id: ELDER_YOSEF_ID,
    fullName: 'Yosef Abraham',
    street: '4 Park Ave',
    houseNumber: '4',
    entrance: null,
    floor: null,
    apartment: null,
    addressNotes: null,
    notes: null,
    lat: new Prisma.Decimal('32.026000'),
    lng: new Prisma.Decimal('34.790000'),
    geocodeStatus: 'ok' as const,
    contacts: [],
  };

  const assignedRivkah = {
    id: DELIVERY_RIVKAH_ID,
    cityId: CITY_A_ID,
    dayId: DAY_ID,
    elderId: ELDER_RIVKAH_ID,
    volunteerId: VOLUNTEER_A_ID,
    status: 'assigned' as const,
    elder: rivkahElder,
  };

  const assignedYosef = {
    id: DELIVERY_YOSEF_ID,
    cityId: CITY_A_ID,
    dayId: DAY_ID,
    elderId: ELDER_YOSEF_ID,
    volunteerId: VOLUNTEER_A_ID,
    status: 'assigned' as const,
    elder: yosefElder,
  };

  const mockPrisma = {
    city: { findUnique: vi.fn() },
    distributionDay: { findFirst: vi.fn() },
    dayParticipation: { findUnique: vi.fn() },
    delivery: { findMany: vi.fn() },
    citySettings: { update: vi.fn() },
    elder: { update: vi.fn() },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPrisma.city.findUnique.mockResolvedValue({
      id: CITY_A_ID,
      archivedAt: null,
      nameHe: 'חולון',
      nameEn: 'Holon',
      settings: {
        centerAddress: '10 Warehouse Rd, Holon',
        centerLat: new Prisma.Decimal('32.011400'),
        centerLng: new Prisma.Decimal('34.774800'),
      },
    });
    mockPrisma.distributionDay.findFirst.mockResolvedValue(publishedDay);
    mockPrisma.dayParticipation.findUnique.mockResolvedValue(null);
    mockPrisma.delivery.findMany.mockResolvedValue([]);
    mockPrisma.citySettings.update.mockResolvedValue({});
    mockPrisma.elder.update.mockResolvedValue({});
    geocode.mockResolvedValue({ kind: 'no_hit' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VolunteerRouteService,
        AbilityFactory,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GEOCODER, useValue: { geocode } },
      ],
    }).compile();

    service = module.get(VolunteerRouteService);
  });

  it('hides the route from a volunteer who has not confirmed', async () => {
    const result = await service.getOwnRoute(CITY_A_ID, DAY_ID, volunteerA());

    expect(result.stops).toEqual([]);
    expect(result.center).toEqual({
      address: '10 Warehouse Rd, Holon',
      lat: HOLON_CENTER.lat,
      lng: HOLON_CENTER.lng,
      placed: true,
    });
    expect(mockPrisma.delivery.findMany).not.toHaveBeenCalled();
    expect(geocode).not.toHaveBeenCalled();
  });

  it('returns only own assigned Holon stops in nearest-neighbor order', async () => {
    mockPrisma.dayParticipation.findUnique.mockResolvedValue({
      cityId: CITY_A_ID,
      status: 'confirmed',
    });
    mockPrisma.delivery.findMany.mockResolvedValue([
      assignedYosef,
      assignedRivkah,
    ]);

    const result = await service.getOwnRoute(CITY_A_ID, DAY_ID, volunteerA());

    expect(mockPrisma.delivery.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          cityId: CITY_A_ID,
          dayId: DAY_ID,
          volunteerId: VOLUNTEER_A_ID,
        }),
      })
    );
    expect(result.stops.map((stop) => stop.elder.fullName)).toEqual([
      'Rivkah Levi',
      'Yosef Abraham',
    ]);
    expect(result.stops.map((stop) => stop.visitOrder)).toEqual([1, 2]);
    expect(result.stops[0]).toMatchObject({
      deliveryId: DELIVERY_RIVKAH_ID,
      placed: true,
      lat: RIVKAH_COORD.lat,
      lng: RIVKAH_COORD.lng,
      elder: { contacts: [{ name: 'Tamar Levi' }] },
    });
    expect(JSON.stringify(result)).not.toContain(VOLUNTEER_B_ID);
    expect(geocode).not.toHaveBeenCalled();
  });

  it('geocodes a pending elder once and caches coordinates', async () => {
    mockPrisma.dayParticipation.findUnique.mockResolvedValue({
      cityId: CITY_A_ID,
      status: 'confirmed',
    });
    mockPrisma.delivery.findMany.mockResolvedValue([
      {
        ...assignedRivkah,
        elder: {
          ...rivkahElder,
          lat: null,
          lng: null,
          geocodeStatus: 'pending',
        },
      },
    ]);
    geocode.mockResolvedValue({ kind: 'hit', coord: RIVKAH_COORD });

    const result = await service.getOwnRoute(CITY_A_ID, DAY_ID, volunteerA());

    expect(geocode).toHaveBeenCalledWith('12 Example St 12, Holon');
    expect(mockPrisma.elder.update).toHaveBeenCalledWith({
      where: { id: ELDER_RIVKAH_ID },
      data: {
        lat: RIVKAH_COORD.lat,
        lng: RIVKAH_COORD.lng,
        geocodeStatus: 'ok',
      },
    });
    expect(result.stops[0]).toMatchObject({
      placed: true,
      visitOrder: 1,
      lat: RIVKAH_COORD.lat,
    });
  });

  it('leaves a failed address on the list without a map pin', async () => {
    mockPrisma.dayParticipation.findUnique.mockResolvedValue({
      cityId: CITY_A_ID,
      status: 'confirmed',
    });
    mockPrisma.delivery.findMany.mockResolvedValue([
      {
        ...assignedYosef,
        elder: {
          ...yosefElder,
          lat: null,
          lng: null,
          geocodeStatus: 'failed',
        },
      },
    ]);

    const result = await service.getOwnRoute(CITY_A_ID, DAY_ID, volunteerA());

    expect(geocode).not.toHaveBeenCalled();
    expect(result.stops[0]).toMatchObject({
      deliveryId: DELIVERY_YOSEF_ID,
      placed: false,
      visitOrder: null,
      lat: null,
      lng: null,
    });
  });

  it('geocodes a 0,0 distribution center and caches it', async () => {
    mockPrisma.city.findUnique.mockResolvedValue({
      id: CITY_A_ID,
      archivedAt: null,
      nameHe: 'חולון',
      nameEn: 'Holon',
      settings: {
        centerAddress: '10 Warehouse Rd, Holon',
        centerLat: new Prisma.Decimal('0'),
        centerLng: new Prisma.Decimal('0'),
      },
    });
    geocode.mockResolvedValue({ kind: 'hit', coord: HOLON_CENTER });

    const result = await service.getOwnRoute(CITY_A_ID, DAY_ID, volunteerA());

    expect(geocode).toHaveBeenCalledWith('10 Warehouse Rd, Holon');
    expect(mockPrisma.citySettings.update).toHaveBeenCalledWith({
      where: { cityId: CITY_A_ID },
      data: {
        centerLat: HOLON_CENTER.lat,
        centerLng: HOLON_CENTER.lng,
      },
    });
    expect(result.center.placed).toBe(true);
    expect(result.center.lat).toBe(HOLON_CENTER.lat);
  });

  it('caps live geocodes per request and leaves the rest unplaced', async () => {
    mockPrisma.dayParticipation.findUnique.mockResolvedValue({
      cityId: CITY_A_ID,
      status: 'confirmed',
    });
    const pendingStops = [
      pendingHolonDelivery(
        'Dana Cohen',
        '20 Herzl St',
        'a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1',
        'b1b1b1b1-b1b1-41b1-81b1-b1b1b1b1b1b1'
      ),
      pendingHolonDelivery(
        'Miriam Cohen',
        '8 Weizmann St',
        'a2a2a2a2-a2a2-42a2-82a2-a2a2a2a2a2a2',
        'b2b2b2b2-b2b2-42b2-82b2-b2b2b2b2b2b2'
      ),
      pendingHolonDelivery(
        'Noam Levi',
        '5 Sokolov St',
        'a3a3a3a3-a3a3-43a3-83a3-a3a3a3a3a3a3',
        'b3b3b3b3-b3b3-43b3-83b3-b3b3b3b3b3b3'
      ),
      pendingHolonDelivery(
        'Tamar Levi',
        '15 Shenkar St',
        'a4a4a4a4-a4a4-44a4-84a4-a4a4a4a4a4a4',
        'b4b4b4b4-b4b4-44b4-84b4-b4b4b4b4b4b4'
      ),
    ];
    mockPrisma.delivery.findMany.mockResolvedValue(pendingStops);
    geocode.mockImplementation(async (query: string) => ({
      kind: 'hit' as const,
      coord: {
        lat: 32.01 + query.length / 1000,
        lng: 34.77,
      },
    }));

    const result = await service.getOwnRoute(CITY_A_ID, DAY_ID, volunteerA());

    expect(geocode).toHaveBeenCalledTimes(MAX_LIVE_GEOCODES_PER_REQUEST);
    expect(result.stops.filter((stop) => stop.placed)).toHaveLength(
      MAX_LIVE_GEOCODES_PER_REQUEST
    );
    expect(result.stops.filter((stop) => !stop.placed)).toHaveLength(
      pendingStops.length - MAX_LIVE_GEOCODES_PER_REQUEST
    );
    expect(mockPrisma.elder.update).toHaveBeenCalledTimes(
      MAX_LIVE_GEOCODES_PER_REQUEST
    );
    expect(
      mockPrisma.elder.update.mock.calls.every(
        (call) => call[0]?.data?.geocodeStatus === 'ok'
      )
    ).toBe(true);
  });

  it('persists failed only when Nominatim answers with no usable hit', async () => {
    mockPrisma.dayParticipation.findUnique.mockResolvedValue({
      cityId: CITY_A_ID,
      status: 'confirmed',
    });
    mockPrisma.delivery.findMany.mockResolvedValue([
      {
        ...assignedRivkah,
        elder: {
          ...rivkahElder,
          lat: null,
          lng: null,
          geocodeStatus: 'pending',
        },
      },
    ]);
    geocode.mockResolvedValue({ kind: 'no_hit' });

    const result = await service.getOwnRoute(CITY_A_ID, DAY_ID, volunteerA());

    expect(geocode).toHaveBeenCalledWith('12 Example St 12, Holon');
    expect(mockPrisma.elder.update).toHaveBeenCalledWith({
      where: { id: ELDER_RIVKAH_ID },
      data: { geocodeStatus: 'failed' },
    });
    expect(result.stops[0]).toMatchObject({
      placed: false,
      lat: null,
      lng: null,
    });
  });

  it('leaves geocodeStatus unchanged after a transient Nominatim failure', async () => {
    mockPrisma.dayParticipation.findUnique.mockResolvedValue({
      cityId: CITY_A_ID,
      status: 'confirmed',
    });
    mockPrisma.delivery.findMany.mockResolvedValue([
      {
        ...assignedRivkah,
        elder: {
          ...rivkahElder,
          lat: null,
          lng: null,
          geocodeStatus: 'pending',
        },
      },
    ]);
    geocode.mockResolvedValue({ kind: 'transient' });

    const result = await service.getOwnRoute(CITY_A_ID, DAY_ID, volunteerA());

    expect(geocode).toHaveBeenCalledWith('12 Example St 12, Holon');
    expect(mockPrisma.elder.update).not.toHaveBeenCalled();
    expect(result.stops[0]).toMatchObject({
      placed: false,
      lat: null,
      lng: null,
    });
  });

  it('persists failed when no geocode query can be built', async () => {
    mockPrisma.dayParticipation.findUnique.mockResolvedValue({
      cityId: CITY_A_ID,
      status: 'confirmed',
    });
    mockPrisma.delivery.findMany.mockResolvedValue([
      {
        ...assignedYosef,
        elder: {
          ...yosefElder,
          street: '',
          houseNumber: '',
          lat: null,
          lng: null,
          geocodeStatus: 'pending',
        },
      },
    ]);

    const result = await service.getOwnRoute(CITY_A_ID, DAY_ID, volunteerA());

    expect(geocode).not.toHaveBeenCalled();
    expect(mockPrisma.elder.update).toHaveBeenCalledWith({
      where: { id: ELDER_YOSEF_ID },
      data: { geocodeStatus: 'failed' },
    });
    expect(result.stops[0]?.placed).toBe(false);
  });

  it('hides another city from a volunteer', async () => {
    await expect(
      service.getOwnRoute(CITY_B_ID, DAY_ID, volunteerA())
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

function pendingHolonDelivery(
  fullName: string,
  street: string,
  elderId: string,
  deliveryId: string
): {
  id: string;
  cityId: string;
  dayId: string;
  elderId: string;
  volunteerId: string;
  status: 'assigned';
  elder: {
    id: string;
    fullName: string;
    street: string;
    houseNumber: string;
    entrance: null;
    floor: null;
    apartment: null;
    addressNotes: null;
    notes: null;
    lat: null;
    lng: null;
    geocodeStatus: 'pending';
    contacts: [];
  };
} {
  return {
    id: deliveryId,
    cityId: CITY_A_ID,
    dayId: DAY_ID,
    elderId,
    volunteerId: VOLUNTEER_A_ID,
    status: 'assigned',
    elder: {
      id: elderId,
      fullName,
      street,
      houseNumber: '1',
      entrance: null,
      floor: null,
      apartment: null,
      addressNotes: null,
      notes: null,
      lat: null,
      lng: null,
      geocodeStatus: 'pending',
      contacts: [],
    },
  };
}
