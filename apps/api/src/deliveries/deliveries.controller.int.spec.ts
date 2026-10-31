import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app.module';
import type { UserWithMemberships } from '../abilities/ability.factory';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { configureApp } from '../configure-app';
import { NOTIFICATION_PROVIDER } from '../notifications/notification.provider';
import { PrismaService } from '../prisma/prisma.service';
import {
  CITY_A_ID,
  CITY_B_ID,
  COORDINATOR_A_ID,
  coordinatorA,
  coordinatorB,
  pendingVolunteer,
  volunteerA,
  volunteerB,
  VOLUNTEER_A_ID,
  VOLUNTEER_B_ID,
} from '../test/fake-users';

const DAY_ID = '33333333-3333-4333-8333-333333333333';
const ELDER_RIVKAH_ID = '12121212-1212-4121-8121-121212121212';
const DELIVERY_RIVKAH_ID = '16161616-1616-4161-8161-161616161616';
const MATCH_PERM_ID = '14141414-1414-4141-8141-141414141414';

describe('Deliveries HTTP authorization', () => {
  let app: INestApplication;
  let currentUser: UserWithMemberships | null = null;

  const publishedDay = {
    id: DAY_ID,
    createdAt: new Date('2026-10-28T09:00:00.000Z'),
    updatedAt: new Date('2026-10-28T09:00:00.000Z'),
    cityId: CITY_A_ID,
    date: new Date('2026-11-15T00:00:00.000Z'),
    startTime: new Date(Date.UTC(1970, 0, 1, 9, 0, 0)),
    endTime: new Date(Date.UTC(1970, 0, 1, 14, 0, 0)),
    notesForVolunteers: 'Bring a folding cart',
    internalNotes: 'Need extra rice bags',
    addOns: ['holiday honey'],
    status: 'published' as const,
    publishedAt: new Date('2026-10-28T09:00:00.000Z'),
    closedAt: null,
    createdById: COORDINATOR_A_ID,
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
    createdAt: new Date('2026-10-28T09:00:00.000Z'),
    updatedAt: new Date('2026-10-28T09:00:00.000Z'),
    cityId: CITY_A_ID,
    dayId: DAY_ID,
    elderId: ELDER_RIVKAH_ID,
    volunteerId: VOLUNTEER_A_ID,
    matchId: MATCH_PERM_ID,
    status: 'assigned' as const,
    notDeliveredReason: null,
    note: null,
    routeOrder: null,
    assignedAt: new Date('2026-10-28T09:00:00.000Z'),
    pickedAt: null,
    finalAt: null,
    resolution: null,
    resolvedById: null,
    elder: rivkahElder,
    volunteer: {
      id: VOLUNTEER_A_ID,
      firstName: 'Yonatan',
      lastName: 'Bar',
    },
  };

  const mockPrisma = {
    isConnected: vi.fn().mockResolvedValue(false),
    city: {
      findUnique: vi.fn().mockResolvedValue({
        id: CITY_A_ID,
        archivedAt: null,
      }),
    },
    citySettings: { findUnique: vi.fn() },
    distributionDay: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn().mockResolvedValue(publishedDay),
      update: vi.fn(),
    },
    cityMembership: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
    },
    dayParticipation: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn(),
    },
    delivery: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      createMany: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(assignedRivkah),
      update: vi.fn(),
    },
    elder: { findMany: vi.fn().mockResolvedValue([]) },
    match: { findMany: vi.fn().mockResolvedValue([]) },
    deliveryEvent: {
      createMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
    notificationLog: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
    },
    pushSubscription: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    messageTemplate: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
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
    });
    mockPrisma.distributionDay.findFirst.mockResolvedValue(publishedDay);
    mockPrisma.delivery.findMany.mockResolvedValue([]);
    mockPrisma.delivery.findFirst.mockImplementation(
      async (args?: { include?: unknown }) => {
        if (args?.include !== undefined) {
          return {
            ...assignedRivkah,
            volunteerId: VOLUNTEER_B_ID,
            volunteer: {
              id: VOLUNTEER_B_ID,
              firstName: 'Dana',
              lastName: 'Levi',
            },
          };
        }
        return assignedRivkah;
      }
    );
    mockPrisma.delivery.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.dayParticipation.findUnique.mockResolvedValue(null);
    mockPrisma.dayParticipation.findMany.mockResolvedValue([]);
    mockPrisma.dayParticipation.findFirst.mockResolvedValue({
      volunteerId: VOLUNTEER_B_ID,
    });
    mockPrisma.cityMembership.findMany.mockResolvedValue([]);
    mockPrisma.cityMembership.findUnique.mockResolvedValue({
      role: 'volunteer',
      status: 'active',
      user: { archivedAt: null },
    });
    mockPrisma.delivery.update.mockResolvedValue({
      ...assignedRivkah,
      volunteerId: VOLUNTEER_B_ID,
      volunteer: {
        id: VOLUNTEER_B_ID,
        firstName: 'Dana',
        lastName: 'Levi',
      },
    });
    mockPrisma.deliveryEvent.create.mockResolvedValue({});
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
        callback(mockPrisma)
    );
  });

  describe('GET /api/cities/:cityId/distribution-days/:dayId/deliveries', () => {
    it('lets a coordinator list all deliveries including unassigned', async () => {
      currentUser = coordinatorA();
      mockPrisma.delivery.findMany.mockResolvedValue([assignedRivkah]);
      mockPrisma.dayParticipation.findMany.mockResolvedValue([
        {
          volunteer: {
            id: VOLUNTEER_A_ID,
            firstName: 'Yonatan',
            lastName: 'Bar',
          },
        },
      ]);

      const response = await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/distribution-days/${DAY_ID}/deliveries`)
        .expect(200);

      expect(mockPrisma.dayParticipation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            cityId: CITY_A_ID,
            dayId: DAY_ID,
            status: 'confirmed',
          }),
        })
      );
      expect(response.body.unassignedCount).toBe(0);
      expect(response.body.deliveries[0].elder.fullName).toBe('Rivkah Levi');
      expect(response.body.deliveries[0].volunteerId).toBe(VOLUNTEER_A_ID);
      expect(response.body.assignableVolunteers).toEqual([
        {
          id: VOLUNTEER_A_ID,
          firstName: 'Yonatan',
          lastName: 'Bar',
        },
      ]);
    });

    it('lists a prefilled unmatched elder as needing a volunteer', async () => {
      currentUser = coordinatorA();
      mockPrisma.delivery.findMany.mockResolvedValue([
        {
          ...assignedRivkah,
          id: '17171717-1717-4171-8171-171717171717',
          elderId: '13131313-1313-4131-8131-131313131313',
          volunteerId: null,
          matchId: null,
          status: 'unassigned' as const,
          assignedAt: null,
          volunteer: null,
          elder: {
            ...rivkahElder,
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
      ]);
      mockPrisma.dayParticipation.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/distribution-days/${DAY_ID}/deliveries`)
        .expect(200);

      expect(response.body.unassignedCount).toBe(1);
      expect(response.body.deliveries[0]).toMatchObject({
        volunteerId: null,
        matchId: null,
        status: 'unassigned',
        elder: { fullName: 'Yosef Abraham' },
      });
    });

    it('lets a confirmed volunteer see only their assigned deliveries', async () => {
      currentUser = volunteerA();
      mockPrisma.dayParticipation.findUnique.mockResolvedValue({
        id: '44444444-4444-4444-8444-444444444444',
        cityId: CITY_A_ID,
        dayId: DAY_ID,
        volunteerId: VOLUNTEER_A_ID,
        status: 'confirmed',
        respondedAt: new Date('2026-10-29T10:00:00.000Z'),
        cancelReason: null,
        finishedAt: null,
      });
      mockPrisma.delivery.findMany.mockResolvedValue([assignedRivkah]);

      const response = await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/distribution-days/${DAY_ID}/deliveries`)
        .expect(200);

      expect(response.body.deliveries).toHaveLength(1);
      expect(response.body.deliveries[0].elder.fullName).toBe('Rivkah Levi');
      expect(response.body.deliveries[0].elder.contacts).toEqual([
        {
          name: 'Tamar Levi',
          relation: 'child',
          phone: '+972506666666',
          isPrimary: true,
        },
      ]);
      expect(response.body.deliveries[0].volunteerId).toBeUndefined();
      expect(response.body.assignableVolunteers).toBeUndefined();
    });

    it('hides another city from a coordinator', async () => {
      currentUser = coordinatorB();
      await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/distribution-days/${DAY_ID}/deliveries`)
        .expect(404);
    });

    it('forbids a pending member', async () => {
      currentUser = pendingVolunteer();
      await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/distribution-days/${DAY_ID}/deliveries`)
        .expect(403);
    });
  });

  describe('PATCH /api/cities/:cityId/distribution-days/:dayId/deliveries/:deliveryId', () => {
    it('lets a coordinator assign a volunteer', async () => {
      currentUser = coordinatorA();
      const response = await request(app.getHttpServer())
        .patch(
          `/api/cities/${CITY_A_ID}/distribution-days/${DAY_ID}/deliveries/${DELIVERY_RIVKAH_ID}`
        )
        .send({ volunteerId: VOLUNTEER_B_ID })
        .expect(200);

      expect(response.body.volunteerId).toBe(VOLUNTEER_B_ID);
    });

    it('rejects assigning a volunteer who has not confirmed for the day', async () => {
      currentUser = coordinatorA();
      mockPrisma.dayParticipation.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .patch(
          `/api/cities/${CITY_A_ID}/distribution-days/${DAY_ID}/deliveries/${DELIVERY_RIVKAH_ID}`
        )
        .send({ volunteerId: VOLUNTEER_B_ID })
        .expect(400);

      expect(response.body.message).toBe('deliveries.invalid_volunteer');
      expect(mockPrisma.delivery.updateMany).not.toHaveBeenCalled();
    });

    it('lets a coordinator unassign a delivery', async () => {
      currentUser = coordinatorA();
      mockPrisma.delivery.findFirst.mockImplementation(
        async (args?: { include?: unknown }) => {
          if (args?.include !== undefined) {
            return {
              ...assignedRivkah,
              volunteerId: null,
              status: 'unassigned' as const,
              assignedAt: null,
              volunteer: null,
            };
          }
          return assignedRivkah;
        }
      );

      const response = await request(app.getHttpServer())
        .patch(
          `/api/cities/${CITY_A_ID}/distribution-days/${DAY_ID}/deliveries/${DELIVERY_RIVKAH_ID}`
        )
        .send({ volunteerId: null })
        .expect(200);

      expect(response.body.volunteerId).toBeNull();
      expect(response.body.status).toBe('unassigned');
    });

    it('forbids a volunteer from assigning deliveries', async () => {
      currentUser = volunteerA();
      await request(app.getHttpServer())
        .patch(
          `/api/cities/${CITY_A_ID}/distribution-days/${DAY_ID}/deliveries/${DELIVERY_RIVKAH_ID}`
        )
        .send({ volunteerId: volunteerB().id })
        .expect(403);
    });

    it('hides another city from a coordinator', async () => {
      currentUser = coordinatorB();
      await request(app.getHttpServer())
        .patch(
          `/api/cities/${CITY_A_ID}/distribution-days/${DAY_ID}/deliveries/${DELIVERY_RIVKAH_ID}`
        )
        .send({ volunteerId: VOLUNTEER_B_ID })
        .expect(404);
    });

    it('hides another city from a volunteer on GET', async () => {
      currentUser = volunteerA();
      await request(app.getHttpServer())
        .get(`/api/cities/${CITY_B_ID}/distribution-days/${DAY_ID}/deliveries`)
        .expect(404);
    });
  });
});
