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
});
