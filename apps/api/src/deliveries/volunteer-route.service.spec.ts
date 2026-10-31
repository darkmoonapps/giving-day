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
import { VolunteerRouteService } from './volunteer-route.service';

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
    geocode.mockResolvedValue(null);

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
    geocode.mockResolvedValue(RIVKAH_COORD);

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
    geocode.mockResolvedValue(HOLON_CENTER);

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

  it('hides another city from a volunteer', async () => {
    await expect(
      service.getOwnRoute(CITY_B_ID, DAY_ID, volunteerA())
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
