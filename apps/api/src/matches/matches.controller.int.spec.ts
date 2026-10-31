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
  MATCH_A_ID,
  createMatchPayload,
  fakeMatch,
  fakeVolunteerUser,
} from '../test/fake-matches';

describe('Matches HTTP authorization', () => {
  let app: INestApplication;
  let currentUser: UserWithMemberships | null = null;

  const matchA = fakeMatch();

  const mockPrisma = {
    isConnected: vi.fn().mockResolvedValue(false),
    city: {
      findUnique: vi.fn().mockResolvedValue({
        id: CITY_A_ID,
        timezone: 'Asia/Jerusalem',
        archivedAt: null,
      }),
    },
    match: {
      findMany: vi.fn().mockResolvedValue([matchA]),
      findFirst: vi.fn().mockResolvedValue(matchA),
      findFirstOrThrow: vi.fn().mockResolvedValue(matchA),
      create: vi.fn().mockResolvedValue(matchA),
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
    mockPrisma.match.findMany.mockResolvedValue([matchA]);
    mockPrisma.match.findFirst.mockResolvedValue(null);
    mockPrisma.match.findFirstOrThrow.mockResolvedValue(matchA);
    mockPrisma.match.create.mockResolvedValue(matchA);
    mockPrisma.match.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.elder.findFirst.mockResolvedValue({
      id: ELDER_A_ID,
      status: 'active',
    });
    mockPrisma.user.findFirst.mockResolvedValue(fakeVolunteerUser());
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
        callback(mockPrisma)
    );
  });

  describe('unauthenticated', () => {
    it('rejects matches without a session', async () => {
      await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/matches`)
        .expect(401);
    });
  });

  describe('GET /api/cities/:cityId/matches', () => {
    it('allows a city coordinator', async () => {
      currentUser = coordinatorA();
      const response = await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/matches`)
        .expect(200);

      expect(response.body.matches[0].elder.fullName).toBe('Elder A');
      expect(response.body.matches[0].volunteer.firstName).toBe('Yonatan');
    });

    it('allows a super admin', async () => {
      currentUser = superAdmin();
      await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/matches`)
        .expect(200);
    });

    it('forbids a volunteer', async () => {
      currentUser = volunteerA();
      await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/matches`)
        .expect(403);
    });

    it('forbids a pending member', async () => {
      currentUser = pendingVolunteer();
      await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/matches`)
        .expect(403);
    });

    it('hides another city from a coordinator', async () => {
      currentUser = coordinatorB();
      await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/matches`)
        .expect(404);
    });
  });

  describe('POST /api/cities/:cityId/matches', () => {
    it('creates a permanent match for a coordinator', async () => {
      currentUser = coordinatorA();
      const response = await request(app.getHttpServer())
        .post(`/api/cities/${CITY_A_ID}/matches`)
        .send(createMatchPayload({ startsAt: '2026-10-01' }))
        .expect(201);

      expect(response.body.id).toBe(MATCH_A_ID);
      expect(mockPrisma.match.create).toHaveBeenCalled();
    });

    it('returns 409 when the elder already has a current match', async () => {
      currentUser = coordinatorA();
      mockPrisma.match.findFirst.mockResolvedValue({ id: MATCH_A_ID });

      const response = await request(app.getHttpServer())
        .post(`/api/cities/${CITY_A_ID}/matches`)
        .send(createMatchPayload())
        .expect(409);

      expect(response.body.message).toBe('matches.elder_already_matched');
    });

    it('rejects a missing elder id', async () => {
      currentUser = coordinatorA();
      await request(app.getHttpServer())
        .post(`/api/cities/${CITY_A_ID}/matches`)
        .send({ volunteerId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' })
        .expect(400);
    });

    it('forbids a volunteer', async () => {
      currentUser = volunteerA();
      await request(app.getHttpServer())
        .post(`/api/cities/${CITY_A_ID}/matches`)
        .send(createMatchPayload())
        .expect(403);
    });

    it('hides another city from a coordinator', async () => {
      currentUser = coordinatorB();
      await request(app.getHttpServer())
        .post(`/api/cities/${CITY_A_ID}/matches`)
        .send(createMatchPayload())
        .expect(404);
    });
  });

  describe('POST /api/cities/:cityId/matches/:matchId/end', () => {
    it('ends a match for a coordinator', async () => {
      currentUser = coordinatorA();
      mockPrisma.match.findFirst.mockResolvedValue(matchA);
      mockPrisma.match.findFirstOrThrow.mockResolvedValue(
        fakeMatch({
          endsAt: new Date('2026-10-31T00:00:00.000Z'),
          endReason: 'reassigned',
        })
      );

      const response = await request(app.getHttpServer())
        .post(`/api/cities/${CITY_A_ID}/matches/${MATCH_A_ID}/end`)
        .send({ endReason: 'reassigned', endsAt: '2026-10-31' })
        .expect(200);

      expect(response.body.endsAt).toBe('2026-10-31');
      expect(response.body.endReason).toBe('reassigned');
    });

    it('forbids a volunteer', async () => {
      currentUser = volunteerA();
      await request(app.getHttpServer())
        .post(`/api/cities/${CITY_A_ID}/matches/${MATCH_A_ID}/end`)
        .send({ endReason: 'other' })
        .expect(403);
    });

    it('hides another city from a coordinator', async () => {
      currentUser = coordinatorB();
      await request(app.getHttpServer())
        .post(`/api/cities/${CITY_A_ID}/matches/${MATCH_A_ID}/end`)
        .send({ endReason: 'other' })
        .expect(404);
    });
  });
});
