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
import { PrismaService } from '../prisma/prisma.service';
import {
  CITY_A_ID,
  coordinatorA,
  coordinatorB,
  pendingVolunteer,
  superAdmin,
  volunteerA,
} from '../test/fake-users';
import { ELDER_A_ID } from '../test/fake-elders';
import {
  DAY_A_ID,
  DAY_DATE,
  MATCH_ONE_TIME_ID,
  createOneTimeMatchPayload,
  fakeOneTimeMatch,
  fakeVolunteerUser,
} from '../test/fake-matches';

describe('One-time matches HTTP authorization', () => {
  let app: INestApplication;
  let currentUser: UserWithMemberships | null = null;

  const oneTimeMatch = fakeOneTimeMatch();
  const basePath = `/api/cities/${CITY_A_ID}/distribution-days/${DAY_A_ID}/one-time-matches`;

  const mockPrisma = {
    isConnected: vi.fn().mockResolvedValue(false),
    city: {
      findUnique: vi.fn().mockResolvedValue({
        id: CITY_A_ID,
        timezone: 'Asia/Jerusalem',
        archivedAt: null,
      }),
    },
    distributionDay: {
      findFirst: vi.fn().mockResolvedValue({
        id: DAY_A_ID,
        cityId: CITY_A_ID,
        date: DAY_DATE,
        status: 'published',
      }),
    },
    match: {
      findMany: vi.fn().mockResolvedValue([oneTimeMatch]),
      findFirst: vi.fn().mockResolvedValue(null),
      findFirstOrThrow: vi.fn().mockResolvedValue(oneTimeMatch),
      create: vi.fn().mockResolvedValue(oneTimeMatch),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    elder: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue({
        id: ELDER_A_ID,
        status: 'active',
      }),
    },
    user: {
      findMany: vi.fn().mockResolvedValue([fakeVolunteerUser()]),
      findFirst: vi.fn().mockResolvedValue(fakeVolunteerUser()),
    },
    dayParticipation: {
      findMany: vi.fn().mockResolvedValue([{ volunteer: fakeVolunteerUser() }]),
      findFirst: vi.fn().mockResolvedValue({
        volunteerId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      }),
    },
    delivery: {
      findFirst: vi.fn().mockResolvedValue(null),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    deliveryEvent: {
      create: vi.fn().mockResolvedValue({}),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
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
      timezone: 'Asia/Jerusalem',
      archivedAt: null,
    });
    mockPrisma.distributionDay.findFirst.mockResolvedValue({
      id: DAY_A_ID,
      cityId: CITY_A_ID,
      date: DAY_DATE,
      status: 'published',
    });
    mockPrisma.match.findMany.mockResolvedValue([oneTimeMatch]);
    mockPrisma.match.findFirst.mockResolvedValue(null);
    mockPrisma.match.findFirstOrThrow.mockResolvedValue(oneTimeMatch);
    mockPrisma.match.create.mockResolvedValue(oneTimeMatch);
    mockPrisma.match.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.elder.findFirst.mockResolvedValue({
      id: ELDER_A_ID,
      status: 'active',
    });
    mockPrisma.user.findFirst.mockResolvedValue(fakeVolunteerUser());
    mockPrisma.dayParticipation.findMany.mockResolvedValue([
      { volunteer: fakeVolunteerUser() },
    ]);
    mockPrisma.dayParticipation.findFirst.mockResolvedValue({
      volunteerId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    });
    mockPrisma.delivery.findFirst.mockResolvedValue(null);
    mockPrisma.delivery.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
        callback(mockPrisma)
    );
  });

  describe('unauthenticated', () => {
    it('rejects one-time matches without a session', async () => {
      await request(app.getHttpServer()).get(basePath).expect(401);
    });
  });

  describe('GET one-time-matches', () => {
    it('allows a city coordinator', async () => {
      currentUser = coordinatorA();
      const response = await request(app.getHttpServer())
        .get(basePath)
        .expect(200);

      expect(response.body.matches[0].type).toBe('one_time');
      expect(response.body.matches[0].dayId).toBe(DAY_A_ID);
    });

    it('allows a super admin', async () => {
      currentUser = superAdmin();
      await request(app.getHttpServer()).get(basePath).expect(200);
    });

    it('forbids a volunteer', async () => {
      currentUser = volunteerA();
      await request(app.getHttpServer()).get(basePath).expect(403);
    });

    it('forbids a pending member', async () => {
      currentUser = pendingVolunteer();
      await request(app.getHttpServer()).get(basePath).expect(403);
    });

    it('hides another city from a coordinator', async () => {
      currentUser = coordinatorB();
      await request(app.getHttpServer()).get(basePath).expect(404);
    });
  });

  describe('POST one-time-matches', () => {
    it('creates a one-time match for a coordinator', async () => {
      currentUser = coordinatorA();
      const response = await request(app.getHttpServer())
        .post(basePath)
        .send(createOneTimeMatchPayload())
        .expect(201);

      expect(response.body.id).toBe(MATCH_ONE_TIME_ID);
      expect(response.body.type).toBe('one_time');
      expect(mockPrisma.match.create).toHaveBeenCalled();
      expect(mockPrisma.dayParticipation.findFirst).toHaveBeenCalled();
    });

    it('rejects a volunteer who has not confirmed for the day', async () => {
      currentUser = coordinatorA();
      mockPrisma.dayParticipation.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post(basePath)
        .send(createOneTimeMatchPayload())
        .expect(400);

      expect(response.body.message).toBe('matches.volunteer_not_confirmed');
      expect(mockPrisma.match.create).not.toHaveBeenCalled();
    });

    it('returns 409 when the elder already has a one-time match for the day', async () => {
      currentUser = coordinatorA();
      mockPrisma.match.findFirst.mockResolvedValue({ id: MATCH_ONE_TIME_ID });

      const response = await request(app.getHttpServer())
        .post(basePath)
        .send(createOneTimeMatchPayload())
        .expect(409);

      expect(response.body.message).toBe(
        'matches.elder_already_matched_for_day'
      );
    });

    it('rejects a missing elder id', async () => {
      currentUser = coordinatorA();
      await request(app.getHttpServer())
        .post(basePath)
        .send({ volunteerId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' })
        .expect(400);
    });

    it('forbids a volunteer', async () => {
      currentUser = volunteerA();
      await request(app.getHttpServer())
        .post(basePath)
        .send(createOneTimeMatchPayload())
        .expect(403);
    });
  });

  describe('POST one-time-matches/:matchId/end', () => {
    it('ends a one-time match for a coordinator', async () => {
      currentUser = coordinatorA();
      mockPrisma.match.findFirst.mockResolvedValue(oneTimeMatch);
      mockPrisma.match.findFirstOrThrow.mockResolvedValue(
        fakeOneTimeMatch({
          endsAt: DAY_DATE,
          endReason: 'reassigned',
        })
      );

      const response = await request(app.getHttpServer())
        .post(`${basePath}/${MATCH_ONE_TIME_ID}/end`)
        .send({ endReason: 'reassigned' })
        .expect(200);

      expect(response.body.endsAt).toBe('2026-11-12');
      expect(response.body.endReason).toBe('reassigned');
    });

    it('forbids a volunteer', async () => {
      currentUser = volunteerA();
      await request(app.getHttpServer())
        .post(`${basePath}/${MATCH_ONE_TIME_ID}/end`)
        .send({ endReason: 'other' })
        .expect(403);
    });
  });
});
