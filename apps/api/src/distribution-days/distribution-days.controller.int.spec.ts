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
import { NOTIFICATION_PROVIDER } from '../notifications/notification.provider';
import { PrismaService } from '../prisma/prisma.service';
import {
  CITY_A_ID,
  CITY_B_ID,
  COORDINATOR_A_ID,
  coordinatorA,
  coordinatorB,
  pendingVolunteer,
  superAdmin,
  volunteerA,
} from '../test/fake-users';

describe('Distribution days HTTP authorization', () => {
  let app: INestApplication;
  let currentUser: UserWithMemberships | null = null;

  const settingsRow = {
    id: 'settings-1',
    cityId: CITY_A_ID,
    createdAt: new Date('2026-10-01T09:00:00.000Z'),
    updatedAt: new Date('2026-10-01T09:00:00.000Z'),
    centerAddress: '10 Warehouse Rd, Holon',
    centerLat: new Prisma.Decimal('32.011400'),
    centerLng: new Prisma.Decimal('34.774800'),
    defaultStartTime: new Date(Date.UTC(1970, 0, 1, 9, 0, 0)),
    defaultEndTime: new Date(Date.UTC(1970, 0, 1, 14, 0, 0)),
    confirmReminderAfterHours: 24,
    unpickedPushMinutesBeforeEnd: 60,
    missingFinalStatusWaitHours: 72,
    defaultLocale: 'he' as const,
    defaultTheme: 'wisteria-mint',
    orgName: 'Latet Holon',
    logoUrl: null,
    extra: {},
  };

  const publishedDay = {
    id: '33333333-3333-4333-8333-333333333333',
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

  const mockPrisma = {
    isConnected: vi.fn().mockResolvedValue(false),
    city: {
      findUnique: vi.fn().mockResolvedValue({
        id: CITY_A_ID,
        archivedAt: null,
      }),
    },
    citySettings: {
      findUnique: vi.fn().mockResolvedValue(settingsRow),
    },
    distributionDay: {
      create: vi.fn().mockResolvedValue(publishedDay),
      findMany: vi.fn().mockResolvedValue([publishedDay]),
      findFirst: vi.fn().mockResolvedValue(publishedDay),
      update: vi.fn().mockResolvedValue({
        ...publishedDay,
        status: 'closed',
        closedAt: new Date('2026-11-15T16:00:00.000Z'),
      }),
    },
    cityMembership: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    dayParticipation: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn(),
    },
    delivery: {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    elder: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    match: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    deliveryEvent: {
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
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
    mockPrisma.citySettings.findUnique.mockResolvedValue(settingsRow);
    mockPrisma.distributionDay.create.mockResolvedValue(publishedDay);
    mockPrisma.distributionDay.findMany.mockResolvedValue([publishedDay]);
    mockPrisma.distributionDay.findFirst.mockResolvedValue(publishedDay);
    mockPrisma.cityMembership.findMany.mockResolvedValue([]);
    mockPrisma.dayParticipation.findMany.mockResolvedValue([]);
    mockPrisma.dayParticipation.findUnique.mockResolvedValue(null);
    mockPrisma.dayParticipation.upsert.mockResolvedValue({
      id: '44444444-4444-4444-8444-444444444444',
      createdAt: new Date('2026-10-29T10:00:00.000Z'),
      updatedAt: new Date('2026-10-29T10:00:00.000Z'),
      cityId: CITY_A_ID,
      dayId: publishedDay.id,
      volunteerId: volunteerA().id,
      status: 'confirmed',
      respondedAt: new Date('2026-10-29T10:00:00.000Z'),
      cancelReason: null,
      finishedAt: null,
    });
    mockPrisma.delivery.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.delivery.createMany.mockResolvedValue({ count: 0 });
    mockPrisma.delivery.findMany.mockResolvedValue([]);
    mockPrisma.elder.findMany.mockResolvedValue([]);
    mockPrisma.match.findMany.mockResolvedValue([]);
    mockPrisma.deliveryEvent.createMany.mockResolvedValue({ count: 0 });
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
        callback(mockPrisma)
    );
  });

  it('rejects unauthenticated access', async () => {
    await request(app.getHttpServer())
      .get(`/api/cities/${CITY_A_ID}/distribution-days`)
      .expect(401);
  });

  describe('POST /api/cities/:cityId/distribution-days', () => {
    it('lets a city coordinator open a day', async () => {
      currentUser = coordinatorA();
      const response = await request(app.getHttpServer())
        .post(`/api/cities/${CITY_A_ID}/distribution-days`)
        .send({ date: '2026-11-15' })
        .expect(201);

      expect(response.body.status).toBe('published');
      expect(response.body.startTime).toBe('09:00:00');
      expect(response.body.internalNotes).toBe('Need extra rice bags');
    });

    it('prefills unassigned deliveries for active elders without a permanent match', async () => {
      currentUser = coordinatorA();
      const unmatchedElderId = '13131313-1313-4131-8131-131313131313';
      mockPrisma.elder.findMany.mockResolvedValue([{ id: unmatchedElderId }]);
      mockPrisma.match.findMany.mockResolvedValue([]);
      mockPrisma.delivery.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: '17171717-1717-4171-8171-171717171717',
            volunteerId: null,
            status: 'unassigned',
            _count: { events: 0 },
          },
        ]);

      await request(app.getHttpServer())
        .post(`/api/cities/${CITY_A_ID}/distribution-days`)
        .send({ date: '2026-11-15' })
        .expect(201);

      expect(mockPrisma.elder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            cityId: CITY_A_ID,
            status: 'active',
            archivedAt: null,
          },
        })
      );
      expect(mockPrisma.delivery.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            cityId: CITY_A_ID,
            dayId: publishedDay.id,
            elderId: unmatchedElderId,
            volunteerId: null,
            matchId: null,
            status: 'unassigned',
          }),
        ],
        skipDuplicates: true,
      });
    });

    it('lets a super admin open a day', async () => {
      currentUser = superAdmin();
      await request(app.getHttpServer())
        .post(`/api/cities/${CITY_A_ID}/distribution-days`)
        .send({ date: '2026-11-15' })
        .expect(201);
    });

    it('forbids a volunteer from opening a day', async () => {
      currentUser = volunteerA();
      await request(app.getHttpServer())
        .post(`/api/cities/${CITY_A_ID}/distribution-days`)
        .send({ date: '2026-11-15' })
        .expect(403);
    });

    it('forbids a pending member', async () => {
      currentUser = pendingVolunteer();
      await request(app.getHttpServer())
        .post(`/api/cities/${CITY_A_ID}/distribution-days`)
        .send({ date: '2026-11-15' })
        .expect(403);
    });

    it('hides another city from a coordinator', async () => {
      currentUser = coordinatorB();
      await request(app.getHttpServer())
        .post(`/api/cities/${CITY_A_ID}/distribution-days`)
        .send({ date: '2026-11-15' })
        .expect(404);
    });
  });

  describe('GET /api/cities/:cityId/distribution-days', () => {
    it('lets a volunteer list open days without internal notes', async () => {
      currentUser = volunteerA();
      const response = await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/distribution-days`)
        .expect(200);

      expect(response.body.days).toHaveLength(1);
      expect(response.body.days[0].date).toBe('2026-11-15');
      expect(response.body.days[0].internalNotes).toBeUndefined();
    });

    it('lets a coordinator list days with internal notes', async () => {
      currentUser = coordinatorA();
      const response = await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/distribution-days`)
        .expect(200);

      expect(response.body.days[0].internalNotes).toBe('Need extra rice bags');
    });

    it('hides another city from a coordinator', async () => {
      currentUser = coordinatorB();
      await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/distribution-days`)
        .expect(404);
    });

    it('forbids a pending member', async () => {
      currentUser = pendingVolunteer();
      await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/distribution-days`)
        .expect(403);
    });
  });

  describe('GET /api/cities/:cityId/distribution-days/:dayId', () => {
    it('lets a volunteer view an open day', async () => {
      currentUser = volunteerA();
      const response = await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/distribution-days/${publishedDay.id}`)
        .expect(200);

      expect(response.body.notesForVolunteers).toBe('Bring a folding cart');
      expect(response.body.internalNotes).toBeUndefined();
    });
  });

  describe('POST /api/cities/:cityId/distribution-days/:dayId/close', () => {
    it('lets a coordinator close an open day', async () => {
      currentUser = coordinatorA();
      const response = await request(app.getHttpServer())
        .post(
          `/api/cities/${CITY_A_ID}/distribution-days/${publishedDay.id}/close`
        )
        .expect(200);

      expect(response.body.status).toBe('closed');
    });

    it('forbids a volunteer from closing a day', async () => {
      currentUser = volunteerA();
      await request(app.getHttpServer())
        .post(
          `/api/cities/${CITY_A_ID}/distribution-days/${publishedDay.id}/close`
        )
        .expect(403);
    });

    it('hides another city from a coordinator', async () => {
      currentUser = coordinatorB();
      await request(app.getHttpServer())
        .post(
          `/api/cities/${CITY_A_ID}/distribution-days/${publishedDay.id}/close`
        )
        .expect(404);
    });
  });

  describe('POST /api/cities/:cityId/distribution-days/:dayId/participations', () => {
    it('lets a volunteer confirm an open day', async () => {
      currentUser = volunteerA();
      const response = await request(app.getHttpServer())
        .post(
          `/api/cities/${CITY_A_ID}/distribution-days/${publishedDay.id}/participations`
        )
        .send({ status: 'confirmed' })
        .expect(200);

      expect(response.body.status).toBe('confirmed');
      expect(response.body.volunteerId).toBe(volunteerA().id);
      expect(mockPrisma.delivery.updateMany).not.toHaveBeenCalled();
    });

    it('lets a volunteer decline with a reason', async () => {
      currentUser = volunteerA();
      mockPrisma.dayParticipation.upsert.mockResolvedValue({
        id: '44444444-4444-4444-8444-444444444444',
        createdAt: new Date('2026-10-29T10:00:00.000Z'),
        updatedAt: new Date('2026-10-29T10:00:00.000Z'),
        cityId: CITY_A_ID,
        dayId: publishedDay.id,
        volunteerId: volunteerA().id,
        status: 'declined',
        respondedAt: new Date('2026-10-29T10:00:00.000Z'),
        cancelReason: 'Family event in Holon',
        finishedAt: null,
      });

      const response = await request(app.getHttpServer())
        .post(
          `/api/cities/${CITY_A_ID}/distribution-days/${publishedDay.id}/participations`
        )
        .send({
          status: 'declined',
          cancelReason: 'Family event in Holon',
        })
        .expect(200);

      expect(response.body.status).toBe('declined');
      expect(response.body.cancelReason).toBe('Family event in Holon');
      expect(mockPrisma.delivery.updateMany).toHaveBeenCalledWith({
        where: {
          cityId: CITY_A_ID,
          dayId: publishedDay.id,
          volunteerId: volunteerA().id,
          status: { in: ['assigned', 'picked'] },
        },
        data: {
          volunteerId: null,
          status: 'unassigned',
          assignedAt: null,
        },
      });
    });

    it('rejects a decline without a reason', async () => {
      currentUser = volunteerA();
      await request(app.getHttpServer())
        .post(
          `/api/cities/${CITY_A_ID}/distribution-days/${publishedDay.id}/participations`
        )
        .send({ status: 'declined' })
        .expect(400);
      expect(mockPrisma.dayParticipation.upsert).not.toHaveBeenCalled();
    });

    it('rejects a decline with a whitespace-only reason', async () => {
      currentUser = volunteerA();
      const response = await request(app.getHttpServer())
        .post(
          `/api/cities/${CITY_A_ID}/distribution-days/${publishedDay.id}/participations`
        )
        .send({
          status: 'declined',
          cancelReason: '   ',
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(mockPrisma.dayParticipation.upsert).not.toHaveBeenCalled();
    });

    it('rejects a confirm payload that includes a cancelReason', async () => {
      currentUser = volunteerA();
      const response = await request(app.getHttpServer())
        .post(
          `/api/cities/${CITY_A_ID}/distribution-days/${publishedDay.id}/participations`
        )
        .send({
          status: 'confirmed',
          cancelReason: 'Family event in Holon',
        })
        .expect(400);

      expect(response.body.message).toBe('distribution_days.invalid_response');
      expect(mockPrisma.dayParticipation.upsert).not.toHaveBeenCalled();
    });

    it('forbids a coordinator from responding', async () => {
      currentUser = coordinatorA();
      await request(app.getHttpServer())
        .post(
          `/api/cities/${CITY_A_ID}/distribution-days/${publishedDay.id}/participations`
        )
        .send({ status: 'confirmed' })
        .expect(403);
    });

    it('forbids a pending member', async () => {
      currentUser = pendingVolunteer();
      await request(app.getHttpServer())
        .post(
          `/api/cities/${CITY_A_ID}/distribution-days/${publishedDay.id}/participations`
        )
        .send({ status: 'confirmed' })
        .expect(403);
    });

    it('hides another city from a volunteer', async () => {
      currentUser = volunteerA();
      await request(app.getHttpServer())
        .post(
          `/api/cities/${CITY_B_ID}/distribution-days/${publishedDay.id}/participations`
        )
        .send({ status: 'confirmed' })
        .expect(404);
    });
  });

  describe('GET /api/cities/:cityId/distribution-days/:dayId/participations', () => {
    it('lets a coordinator list volunteer responses', async () => {
      currentUser = coordinatorA();
      mockPrisma.cityMembership.findMany.mockResolvedValue([
        {
          userId: volunteerA().id,
          user: {
            id: volunteerA().id,
            firstName: 'Yonatan',
            lastName: 'Bar',
          },
        },
      ]);
      mockPrisma.dayParticipation.findMany.mockResolvedValue([
        {
          id: '44444444-4444-4444-8444-444444444444',
          createdAt: new Date('2026-10-29T10:00:00.000Z'),
          updatedAt: new Date('2026-10-29T10:00:00.000Z'),
          cityId: CITY_A_ID,
          dayId: publishedDay.id,
          volunteerId: volunteerA().id,
          status: 'confirmed',
          respondedAt: new Date('2026-10-29T10:00:00.000Z'),
          cancelReason: null,
          finishedAt: null,
        },
      ]);

      const response = await request(app.getHttpServer())
        .get(
          `/api/cities/${CITY_A_ID}/distribution-days/${publishedDay.id}/participations`
        )
        .expect(200);

      expect(response.body.responses).toEqual([
        {
          volunteerId: volunteerA().id,
          firstName: 'Yonatan',
          lastName: 'Bar',
          responseStatus: 'confirmed',
          cancelReason: null,
          respondedAt: '2026-10-29T10:00:00.000Z',
        },
      ]);
    });

    it('forbids a volunteer from listing city responses', async () => {
      currentUser = volunteerA();
      await request(app.getHttpServer())
        .get(
          `/api/cities/${CITY_A_ID}/distribution-days/${publishedDay.id}/participations`
        )
        .expect(403);
    });

    it('hides another city from a coordinator', async () => {
      currentUser = coordinatorB();
      await request(app.getHttpServer())
        .get(
          `/api/cities/${CITY_A_ID}/distribution-days/${publishedDay.id}/participations`
        )
        .expect(404);
    });
  });
});
