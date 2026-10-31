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
  COORDINATOR_A_ID,
  coordinatorA,
  coordinatorB,
  pendingVolunteer,
  superAdmin,
  volunteerA,
  volunteerB,
} from '../test/fake-users';
import { fakeElder } from '../test/fake-elders';
import {
  CHANGE_REQUEST_A_ID,
  createChangeRequestPayload,
  fakeChangeRequest,
} from '../test/fake-change-requests';

describe('Elder change requests HTTP authorization', () => {
  let app: INestApplication;
  let currentUser: UserWithMemberships | null = null;

  const requestA = fakeChangeRequest();
  const approvedRequest = fakeChangeRequest({
    status: 'approved',
    reviewedById: COORDINATOR_A_ID,
    reviewedAt: new Date('2026-10-31T10:00:00.000Z'),
    elder: fakeElder({
      street: '4 Park Ave',
      notes: 'Entrance is on the side',
    }),
  });

  const mockPrisma = {
    isConnected: vi.fn().mockResolvedValue(false),
    city: {
      findUnique: vi.fn().mockResolvedValue({
        id: CITY_A_ID,
        timezone: 'Asia/Jerusalem',
        archivedAt: null,
      }),
    },
    elder: {
      findFirst: vi.fn().mockResolvedValue(fakeElder()),
      update: vi.fn(),
    },
    elderContact: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    elderChangeRequest: {
      findMany: vi.fn().mockResolvedValue([requestA]),
      findFirst: vi.fn().mockResolvedValue(requestA),
      findFirstOrThrow: vi.fn().mockResolvedValue(requestA),
      create: vi.fn().mockResolvedValue(requestA),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    match: {
      findFirst: vi.fn().mockResolvedValue({ id: 'match-1' }),
    },
    delivery: {
      findFirst: vi.fn().mockResolvedValue(null),
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
    mockPrisma.elder.findFirst.mockResolvedValue(fakeElder());
    mockPrisma.match.findFirst.mockResolvedValue({ id: 'match-1' });
    mockPrisma.delivery.findFirst.mockResolvedValue(null);
    mockPrisma.elderChangeRequest.findMany.mockResolvedValue([requestA]);
    mockPrisma.elderChangeRequest.findFirst.mockResolvedValue(requestA);
    mockPrisma.elderChangeRequest.findFirstOrThrow.mockResolvedValue(requestA);
    mockPrisma.elderChangeRequest.create.mockResolvedValue(requestA);
    mockPrisma.elderChangeRequest.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
        callback(mockPrisma)
    );
  });

  describe('unauthenticated', () => {
    it('rejects change requests without a session', async () => {
      await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/elder-change-requests`)
        .expect(401);
    });
  });

  describe('GET /api/cities/:cityId/elder-change-requests', () => {
    it('allows a city coordinator to list pending requests', async () => {
      currentUser = coordinatorA();
      const response = await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/elder-change-requests`)
        .expect(200);

      expect(response.body.changeRequests[0].status).toBe('pending');
      expect(response.body.changeRequests[0].elder.street).toBe(
        '1 Test Street'
      );
      expect(response.body.changeRequests[0].changes.street.to).toBe(
        '4 Park Ave'
      );
    });

    it('allows a volunteer to list their own requests', async () => {
      currentUser = volunteerA();
      await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/elder-change-requests`)
        .expect(200);

      expect(mockPrisma.elderChangeRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            requestedById: volunteerA().id,
          }),
        })
      );
    });

    it('allows a super admin', async () => {
      currentUser = superAdmin();
      await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/elder-change-requests`)
        .expect(200);
    });

    it('forbids a pending member', async () => {
      currentUser = pendingVolunteer();
      await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/elder-change-requests`)
        .expect(403);
    });

    it('hides another city from a coordinator', async () => {
      currentUser = coordinatorB();
      await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/elder-change-requests`)
        .expect(404);
    });
  });

  describe('POST /api/cities/:cityId/elder-change-requests', () => {
    it('creates a request for an assigned volunteer', async () => {
      currentUser = volunteerA();
      const response = await request(app.getHttpServer())
        .post(`/api/cities/${CITY_A_ID}/elder-change-requests`)
        .send(createChangeRequestPayload())
        .expect(201);

      expect(response.body.id).toBe(CHANGE_REQUEST_A_ID);
      expect(mockPrisma.elderChangeRequest.create).toHaveBeenCalled();
    });

    it('rejects a missing elder id', async () => {
      currentUser = volunteerA();
      await request(app.getHttpServer())
        .post(`/api/cities/${CITY_A_ID}/elder-change-requests`)
        .send({ changes: { notes: 'Knock loudly' } })
        .expect(400);
    });

    it('forbids a coordinator from creating', async () => {
      currentUser = coordinatorA();
      await request(app.getHttpServer())
        .post(`/api/cities/${CITY_A_ID}/elder-change-requests`)
        .send(createChangeRequestPayload())
        .expect(403);
    });

    it('hides another city from a volunteer', async () => {
      currentUser = volunteerA();
      await request(app.getHttpServer())
        .post(
          '/api/cities/22222222-2222-4222-8222-222222222222/elder-change-requests'
        )
        .send(createChangeRequestPayload())
        .expect(404);
    });
  });

  describe('GET /api/cities/:cityId/elder-change-requests/:requestId', () => {
    it('returns one request for a coordinator', async () => {
      currentUser = coordinatorA();
      const response = await request(app.getHttpServer())
        .get(
          `/api/cities/${CITY_A_ID}/elder-change-requests/${CHANGE_REQUEST_A_ID}`
        )
        .expect(200);

      expect(response.body.id).toBe(CHANGE_REQUEST_A_ID);
    });

    it('hides another volunteer request', async () => {
      currentUser = volunteerB();
      mockPrisma.elderChangeRequest.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get(
          `/api/cities/${CITY_A_ID}/elder-change-requests/${CHANGE_REQUEST_A_ID}`
        )
        .expect(404);
    });
  });

  describe('POST /api/cities/:cityId/elder-change-requests/:requestId/approve', () => {
    it('lets a coordinator approve and apply changes', async () => {
      currentUser = coordinatorA();
      mockPrisma.elderChangeRequest.findFirstOrThrow.mockResolvedValue(
        approvedRequest
      );

      const response = await request(app.getHttpServer())
        .post(
          `/api/cities/${CITY_A_ID}/elder-change-requests/${CHANGE_REQUEST_A_ID}/approve`
        )
        .expect(200);

      expect(response.body.status).toBe('approved');
      expect(mockPrisma.elder.update).toHaveBeenCalled();
    });

    it('forbids a volunteer from approving', async () => {
      currentUser = volunteerA();
      await request(app.getHttpServer())
        .post(
          `/api/cities/${CITY_A_ID}/elder-change-requests/${CHANGE_REQUEST_A_ID}/approve`
        )
        .expect(403);
    });

    it('hides another city from a coordinator', async () => {
      currentUser = coordinatorB();
      await request(app.getHttpServer())
        .post(
          `/api/cities/${CITY_A_ID}/elder-change-requests/${CHANGE_REQUEST_A_ID}/approve`
        )
        .expect(404);
    });
  });

  describe('POST /api/cities/:cityId/elder-change-requests/:requestId/reject', () => {
    it('lets a coordinator reject with an optional reason', async () => {
      currentUser = coordinatorA();
      mockPrisma.elderChangeRequest.findFirstOrThrow.mockResolvedValue(
        fakeChangeRequest({
          status: 'rejected',
          reviewedById: COORDINATOR_A_ID,
          reviewedAt: new Date('2026-10-31T10:00:00.000Z'),
          reviewNote: 'Please call the Holon office first',
        })
      );

      const response = await request(app.getHttpServer())
        .post(
          `/api/cities/${CITY_A_ID}/elder-change-requests/${CHANGE_REQUEST_A_ID}/reject`
        )
        .send({ reviewNote: 'Please call the Holon office first' })
        .expect(200);

      expect(response.body.status).toBe('rejected');
      expect(response.body.reviewNote).toBe(
        'Please call the Holon office first'
      );
    });

    it('forbids a volunteer from rejecting', async () => {
      currentUser = volunteerA();
      await request(app.getHttpServer())
        .post(
          `/api/cities/${CITY_A_ID}/elder-change-requests/${CHANGE_REQUEST_A_ID}/reject`
        )
        .expect(403);
    });
  });
});
