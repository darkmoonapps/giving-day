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
import { PrismaService } from '../prisma/prisma.service';
import {
  CITY_A_ID,
  CITY_B_ID,
  coordinatorA,
  coordinatorB,
  pendingVolunteer,
  superAdmin,
  volunteerA,
} from '../test/fake-users';
import { hashJoinToken } from './join-token';

describe('Cities HTTP authorization', () => {
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
    extra: { mapZoom: 14 },
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
      update: vi
        .fn()
        .mockImplementation(({ data }: { data: object }) =>
          Promise.resolve({ ...settingsRow, ...data })
        ),
      create: vi.fn(),
    },
    cityInvite: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi
        .fn()
        .mockImplementation(
          ({ data }: { data: { tokenHash: string; role: string } }) =>
            Promise.resolve({
              id: 'invite-1',
              cityId: CITY_A_ID,
              role: data.role,
              tokenHash: data.tokenHash,
              createdById: 'actor',
              expiresAt: null,
              maxUses: null,
              usedCount: 0,
              revokedAt: null,
              createdAt: new Date('2026-10-28T09:00:00.000Z'),
              updatedAt: new Date('2026-10-28T09:00:00.000Z'),
            })
        ),
    },
    cityMembership: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn().mockResolvedValue(2),
    },
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    session: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };

  beforeAll(async () => {
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
        callback(mockPrisma)
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
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
    mockPrisma.cityInvite.findMany.mockResolvedValue([]);
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
        callback(mockPrisma)
    );
  });

  describe('unauthenticated', () => {
    it('rejects settings without a session', async () => {
      await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/settings`)
        .expect(401);
    });
  });

  describe('GET /api/cities/:cityId/settings', () => {
    it('allows a city coordinator', async () => {
      currentUser = coordinatorA();
      const response = await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/settings`)
        .expect(200);

      expect(response.body.centerAddress).toBe('10 Warehouse Rd, Holon');
    });

    it('allows a super admin', async () => {
      currentUser = superAdmin();
      await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/settings`)
        .expect(200);
    });

    it('forbids a volunteer', async () => {
      currentUser = volunteerA();
      await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/settings`)
        .expect(403);
    });

    it('forbids a pending member', async () => {
      currentUser = pendingVolunteer();
      await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/settings`)
        .expect(403);
    });

    it('hides another city from a coordinator', async () => {
      currentUser = coordinatorB();
      await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/settings`)
        .expect(404);
    });
  });

  describe('PATCH /api/cities/:cityId/settings', () => {
    it('allows a coordinator to update distribution hours', async () => {
      currentUser = coordinatorA();
      mockPrisma.citySettings.update.mockResolvedValue({
        ...settingsRow,
        defaultStartTime: new Date(Date.UTC(1970, 0, 1, 8, 0, 0)),
      });

      const response = await request(app.getHttpServer())
        .patch(`/api/cities/${CITY_A_ID}/settings`)
        .send({ defaultStartTime: '08:00' })
        .expect(200);

      expect(response.body.defaultStartTime).toBe('08:00:00');
    });

    it('forbids a volunteer update', async () => {
      currentUser = volunteerA();
      await request(app.getHttpServer())
        .patch(`/api/cities/${CITY_A_ID}/settings`)
        .send({ defaultStartTime: '08:00' })
        .expect(403);
    });

    it('hides another city from a coordinator', async () => {
      currentUser = coordinatorA();
      await request(app.getHttpServer())
        .patch(`/api/cities/${CITY_B_ID}/settings`)
        .send({ defaultStartTime: '08:00' })
        .expect(404);
    });
  });

  describe('join links', () => {
    it('allows a coordinator to read status and regenerate a secret URL once', async () => {
      currentUser = coordinatorA();
      mockPrisma.cityInvite.findMany.mockResolvedValue([
        {
          id: 'invite-1',
          cityId: CITY_A_ID,
          role: 'volunteer',
          tokenHash: hashJoinToken('fake-join-token'),
          createdById: 'actor',
          expiresAt: null,
          maxUses: null,
          usedCount: 2,
          revokedAt: null,
          createdAt: new Date('2026-10-01T09:00:00.000Z'),
          updatedAt: new Date('2026-10-01T09:00:00.000Z'),
        },
      ]);

      const listed = await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/join-links`)
        .expect(200);

      expect(listed.body.links).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'volunteer',
            active: true,
            usedCount: 2,
          }),
        ])
      );
      expect(listed.body).not.toHaveProperty('token');
      expect(JSON.stringify(listed.body)).not.toContain('fake-join-token');
      expect(JSON.stringify(listed.body)).not.toContain(
        hashJoinToken('fake-join-token')
      );

      const regenerated = await request(app.getHttpServer())
        .post(`/api/cities/${CITY_A_ID}/join-links/volunteer/regenerate`)
        .expect(201);

      const rawToken = regenerated.body.token as string;
      expect(rawToken.length).toBeGreaterThan(20);
      expect(regenerated.body.url).toContain(`/join/${rawToken}`);
      expect(mockPrisma.cityInvite.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tokenHash: hashJoinToken(rawToken),
        }),
      });
    });

    it('allows a super admin to regenerate a coordinator link', async () => {
      currentUser = superAdmin();

      const response = await request(app.getHttpServer())
        .post(`/api/cities/${CITY_A_ID}/join-links/coordinator/regenerate`)
        .expect(201);

      expect(response.body.role).toBe('coordinator');
      expect(response.body.token).toEqual(expect.any(String));
      expect(response.body.url).toContain(response.body.token);
    });

    it('forbids a volunteer from reading or rotating links', async () => {
      currentUser = volunteerA();
      await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/join-links`)
        .expect(403);
      await request(app.getHttpServer())
        .post(`/api/cities/${CITY_A_ID}/join-links/volunteer/regenerate`)
        .expect(403);
    });
  });

  describe('coordinators', () => {
    it('allows a coordinator to list city coordinators', async () => {
      currentUser = coordinatorA();
      mockPrisma.cityMembership.findMany.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/coordinators`)
        .expect(200);
    });

    it('allows a super admin to add a coordinator to any city', async () => {
      currentUser = superAdmin();
      const newUserId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
      mockPrisma.user.findUnique.mockResolvedValue({
        id: newUserId,
        firstName: 'Avi',
        lastName: 'Mizrahi',
        email: 'avi.mizrahi@example.com',
        phone: '+972505555555',
        archivedAt: null,
      });
      mockPrisma.cityMembership.findUnique.mockResolvedValue(null);
      mockPrisma.cityMembership.create.mockResolvedValue({
        id: 'membership-new',
        cityId: CITY_A_ID,
        userId: newUserId,
        role: 'coordinator',
        status: 'active',
        createdAt: new Date('2026-10-01T09:00:00.000Z'),
        approvedAt: new Date('2026-10-01T09:00:00.000Z'),
        user: {
          id: newUserId,
          firstName: 'Avi',
          lastName: 'Mizrahi',
          email: 'avi.mizrahi@example.com',
          phone: '+972505555555',
          archivedAt: null,
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/cities/${CITY_A_ID}/coordinators`)
        .send({ userId: newUserId })
        .expect(201);

      expect(response.body.userId).toBe(newUserId);
    });

    it('forbids a volunteer from listing or adding coordinators', async () => {
      currentUser = volunteerA();
      await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/coordinators`)
        .expect(404);
      await request(app.getHttpServer())
        .post(`/api/cities/${CITY_A_ID}/coordinators`)
        .send({ userId: 'ffffffff-ffff-4fff-8fff-ffffffffffff' })
        .expect(403);
    });

    it('hides another city from a coordinator', async () => {
      currentUser = coordinatorA();
      await request(app.getHttpServer())
        .get(`/api/cities/${CITY_B_ID}/coordinators`)
        .expect(404);
      await request(app.getHttpServer())
        .post(`/api/cities/${CITY_B_ID}/coordinators`)
        .send({ userId: 'ffffffff-ffff-4fff-8fff-ffffffffffff' })
        .expect(404);
    });

    it('forbids a volunteer from removing a coordinator', async () => {
      currentUser = volunteerA();
      await request(app.getHttpServer())
        .delete(
          `/api/cities/${CITY_A_ID}/coordinators/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`
        )
        .expect(403);
    });
  });
});
