import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../app.module';
import type { UserWithMemberships } from '../abilities/ability.factory';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { configureApp } from '../configure-app';
import { GEOCODER } from '../geocoding/geocoding.tokens';
import { NOTIFICATION_PROVIDER } from '../notifications/notification.provider';
import { PrismaService } from '../prisma/prisma.service';
import {
  CITY_A_ID,
  coordinatorA,
  coordinatorB,
  pendingVolunteer,
  volunteerA,
  volunteerB,
  VOLUNTEER_A_ID,
} from '../test/fake-users';

const DAY_ID = '33333333-3333-4333-8333-333333333333';
const ELDER_RIVKAH_ID = '12121212-1212-4121-8121-121212121212';
const ELDER_YOSEF_ID = '13131313-1313-4131-8131-131313131313';
const DELIVERY_RIVKAH_ID = '16161616-1616-4161-8161-161616161616';
const DELIVERY_YOSEF_ID = '17171717-1717-4171-8171-171717171717';

describe('Volunteer route HTTP authorization', () => {
  let app: INestApplication;
  let currentUser: UserWithMemberships | null = null;
  const geocode = vi.fn();

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

  const assignedRivkah = {
    id: DELIVERY_RIVKAH_ID,
    cityId: CITY_A_ID,
    dayId: DAY_ID,
    elderId: ELDER_RIVKAH_ID,
    volunteerId: VOLUNTEER_A_ID,
    status: 'assigned' as const,
    elder: rivkahElder,
  };

  const assignedYosefToB = {
    id: DELIVERY_YOSEF_ID,
    cityId: CITY_A_ID,
    dayId: DAY_ID,
    elderId: ELDER_YOSEF_ID,
    volunteerId: '99999999-9999-4999-8999-999999999999',
    status: 'assigned' as const,
    elder: {
      ...rivkahElder,
      id: ELDER_YOSEF_ID,
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
  };

  const mockPrisma = {
    isConnected: vi.fn().mockResolvedValue(false),
    city: {
      findUnique: vi.fn().mockResolvedValue({
        id: CITY_A_ID,
        archivedAt: null,
        nameHe: 'חולון',
        nameEn: 'Holon',
        settings: {
          centerAddress: '10 Warehouse Rd, Holon',
          centerLat: new Prisma.Decimal('32.011400'),
          centerLng: new Prisma.Decimal('34.774800'),
        },
      }),
    },
    citySettings: { findUnique: vi.fn(), update: vi.fn() },
    distributionDay: {
      findFirst: vi.fn().mockResolvedValue({
        id: DAY_ID,
        cityId: CITY_A_ID,
      }),
    },
    cityMembership: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
    },
    dayParticipation: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    delivery: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    elder: { update: vi.fn() },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(GEOCODER)
      .useValue({ geocode })
      .overrideProvider(NOTIFICATION_PROVIDER)
      .useValue({ send: vi.fn().mockResolvedValue({ ok: true }) })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext): boolean => {
          if (!currentUser) {
            throw new UnauthorizedException('auth.unauthenticated');
          }
          context.switchToHttp().getRequest().user = currentUser;
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    currentUser = null;
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
    mockPrisma.distributionDay.findFirst.mockResolvedValue({
      id: DAY_ID,
      cityId: CITY_A_ID,
    });
    mockPrisma.dayParticipation.findUnique.mockResolvedValue(null);
    mockPrisma.delivery.findMany.mockResolvedValue([]);
    geocode.mockResolvedValue(null);
  });

  it('rejects an unauthenticated caller', async () => {
    await request(app.getHttpServer())
      .get(`/api/cities/${CITY_A_ID}/distribution-days/${DAY_ID}/route`)
      .expect(401);
    expect(geocode).not.toHaveBeenCalled();
  });

  it('lets a confirmed volunteer see only their own Holon stops', async () => {
    currentUser = volunteerA();
    mockPrisma.dayParticipation.findUnique.mockResolvedValue({
      cityId: CITY_A_ID,
      status: 'confirmed',
    });
    mockPrisma.delivery.findMany.mockResolvedValue([assignedRivkah]);

    const response = await request(app.getHttpServer())
      .get(`/api/cities/${CITY_A_ID}/distribution-days/${DAY_ID}/route`)
      .expect(200);

    expect(response.body.center.address).toBe('10 Warehouse Rd, Holon');
    expect(response.body.stops).toHaveLength(1);
    expect(response.body.stops[0].elder.fullName).toBe('Rivkah Levi');
    expect(response.body.stops[0].visitOrder).toBe(1);
    expect(JSON.stringify(response.body)).not.toContain('Yosef Abraham');
    expect(mockPrisma.delivery.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ volunteerId: VOLUNTEER_A_ID }),
      })
    );
    expect(geocode).not.toHaveBeenCalled();
  });

  it('does not leak another volunteer assigned elder', async () => {
    currentUser = volunteerB();
    mockPrisma.dayParticipation.findUnique.mockResolvedValue({
      cityId: CITY_A_ID,
      status: 'confirmed',
    });
    mockPrisma.delivery.findMany.mockResolvedValue([assignedYosefToB]);

    const response = await request(app.getHttpServer())
      .get(`/api/cities/${CITY_A_ID}/distribution-days/${DAY_ID}/route`)
      .expect(200);

    expect(
      response.body.stops.map(
        (stop: { elder: { fullName: string } }) => stop.elder.fullName
      )
    ).toEqual(['Yosef Abraham']);
    expect(JSON.stringify(response.body)).not.toContain('Rivkah Levi');
  });

  it('hides another city from a coordinator', async () => {
    currentUser = coordinatorB();
    await request(app.getHttpServer())
      .get(`/api/cities/${CITY_A_ID}/distribution-days/${DAY_ID}/route`)
      .expect(404);
  });

  it('forbids a pending member', async () => {
    currentUser = pendingVolunteer();
    await request(app.getHttpServer())
      .get(`/api/cities/${CITY_A_ID}/distribution-days/${DAY_ID}/route`)
      .expect(403);
  });

  it('lets a coordinator call the route but still scopes stops to their own assignments', async () => {
    currentUser = coordinatorA();
    const response = await request(app.getHttpServer())
      .get(`/api/cities/${CITY_A_ID}/distribution-days/${DAY_ID}/route`)
      .expect(200);

    expect(response.body.stops).toEqual([]);
    expect(mockPrisma.delivery.findMany).not.toHaveBeenCalled();
  });
});
