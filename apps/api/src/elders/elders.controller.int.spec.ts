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
import { ELDER_A_ID, createElderPayload, fakeElder } from '../test/fake-elders';

describe('Elders HTTP authorization', () => {
  let app: INestApplication;
  let currentUser: UserWithMemberships | null = null;

  const elderA = fakeElder();

  const mockPrisma = {
    isConnected: vi.fn().mockResolvedValue(false),
    city: {
      findUnique: vi.fn().mockResolvedValue({
        id: CITY_A_ID,
        archivedAt: null,
      }),
    },
    elder: {
      findMany: vi.fn().mockResolvedValue([elderA]),
      findFirst: vi.fn().mockResolvedValue(elderA),
      findUniqueOrThrow: vi.fn().mockResolvedValue(elderA),
      create: vi.fn().mockResolvedValue(elderA),
      update: vi.fn().mockResolvedValue(elderA),
    },
    elderContact: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
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
    mockPrisma.elder.findMany.mockResolvedValue([elderA]);
    mockPrisma.elder.findFirst.mockResolvedValue(elderA);
    mockPrisma.elder.findUniqueOrThrow.mockResolvedValue(elderA);
    mockPrisma.elder.create.mockResolvedValue(elderA);
    mockPrisma.elder.update.mockResolvedValue(elderA);
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
        callback(mockPrisma)
    );
  });

  describe('unauthenticated', () => {
    it('rejects elders without a session', async () => {
      await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/elders`)
        .expect(401);
    });
  });

  describe('GET /api/cities/:cityId/elders', () => {
    it('allows a city coordinator', async () => {
      currentUser = coordinatorA();
      const response = await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/elders`)
        .expect(200);

      expect(response.body.elders[0].fullName).toBe('Elder A');
      expect(response.body.elders[0].contacts[0].name).toBe('Contact 1');
    });

    it('allows a super admin', async () => {
      currentUser = superAdmin();
      await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/elders`)
        .expect(200);
    });

    it('forbids a volunteer', async () => {
      currentUser = volunteerA();
      await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/elders`)
        .expect(403);
    });

    it('forbids a pending member', async () => {
      currentUser = pendingVolunteer();
      await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/elders`)
        .expect(403);
    });

    it('hides another city from a coordinator', async () => {
      currentUser = coordinatorB();
      await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/elders`)
        .expect(404);
    });
  });

  describe('POST /api/cities/:cityId/elders', () => {
    it('creates an elder for a coordinator', async () => {
      currentUser = coordinatorA();
      const response = await request(app.getHttpServer())
        .post(`/api/cities/${CITY_A_ID}/elders`)
        .send(createElderPayload())
        .expect(201);

      expect(response.body.fullName).toBe('Elder A');
      expect(mockPrisma.elder.create).toHaveBeenCalled();
    });

    it('rejects a missing full name', async () => {
      currentUser = coordinatorA();
      await request(app.getHttpServer())
        .post(`/api/cities/${CITY_A_ID}/elders`)
        .send({ street: '1 Test Street', houseNumber: '1' })
        .expect(400);
    });

    it('forbids a volunteer', async () => {
      currentUser = volunteerA();
      await request(app.getHttpServer())
        .post(`/api/cities/${CITY_A_ID}/elders`)
        .send(createElderPayload())
        .expect(403);
    });

    it('hides another city from a coordinator', async () => {
      currentUser = coordinatorB();
      await request(app.getHttpServer())
        .post(`/api/cities/${CITY_A_ID}/elders`)
        .send(createElderPayload())
        .expect(404);
    });
  });

  describe('GET /api/cities/:cityId/elders/:elderId', () => {
    it('returns one elder for a coordinator', async () => {
      currentUser = coordinatorA();
      const response = await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/elders/${ELDER_A_ID}`)
        .expect(200);

      expect(response.body.id).toBe(ELDER_A_ID);
    });

    it('forbids a volunteer', async () => {
      currentUser = volunteerA();
      await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/elders/${ELDER_A_ID}`)
        .expect(403);
    });
  });

  describe('PATCH /api/cities/:cityId/elders/:elderId', () => {
    it('updates an elder for a coordinator', async () => {
      currentUser = coordinatorA();
      mockPrisma.elder.findUniqueOrThrow.mockResolvedValue(
        fakeElder({ notes: 'Knock loudly' })
      );

      const response = await request(app.getHttpServer())
        .patch(`/api/cities/${CITY_A_ID}/elders/${ELDER_A_ID}`)
        .send({ notes: 'Knock loudly' })
        .expect(200);

      expect(response.body.notes).toBe('Knock loudly');
    });

    it('hides another city from a coordinator', async () => {
      currentUser = coordinatorB();
      await request(app.getHttpServer())
        .patch(`/api/cities/${CITY_A_ID}/elders/${ELDER_A_ID}`)
        .send({ notes: 'Knock loudly' })
        .expect(404);
    });
  });

  describe('POST /api/cities/:cityId/elders/:elderId/deactivate', () => {
    it('deactivates an elder for a coordinator', async () => {
      currentUser = coordinatorA();
      mockPrisma.elder.update.mockResolvedValue(
        fakeElder({
          status: 'removed',
          archivedAt: new Date('2026-10-31T09:00:00.000Z'),
        })
      );

      const response = await request(app.getHttpServer())
        .post(`/api/cities/${CITY_A_ID}/elders/${ELDER_A_ID}/deactivate`)
        .expect(200);

      expect(response.body.status).toBe('removed');
      expect(response.body.archivedAt).toBe('2026-10-31T09:00:00.000Z');
    });

    it('forbids a volunteer', async () => {
      currentUser = volunteerA();
      await request(app.getHttpServer())
        .post(`/api/cities/${CITY_A_ID}/elders/${ELDER_A_ID}/deactivate`)
        .expect(403);
    });

    it('hides another city from a coordinator', async () => {
      currentUser = coordinatorB();
      await request(app.getHttpServer())
        .post(`/api/cities/${CITY_A_ID}/elders/${ELDER_A_ID}/deactivate`)
        .expect(404);
    });
  });
});
