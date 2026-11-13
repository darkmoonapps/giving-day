import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { defaultMessageCopyFor } from '@giving-day/shared';
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

describe('Message templates HTTP authorization', () => {
  let app: INestApplication;
  let currentUser: UserWithMemberships | null = null;

  const mockPrisma = {
    isConnected: vi.fn().mockResolvedValue(false),
    city: {
      findUnique: vi.fn().mockResolvedValue({
        id: CITY_A_ID,
        archivedAt: null,
      }),
    },
    messageTemplate: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      upsert: vi.fn(),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
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
      archivedAt: null,
    });
    mockPrisma.messageTemplate.findMany.mockResolvedValue([]);
    mockPrisma.messageTemplate.findFirst.mockResolvedValue(null);
    mockPrisma.messageTemplate.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
        callback(mockPrisma)
    );
  });

  describe('unauthenticated', () => {
    it('rejects message templates without a session', async () => {
      await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/message-templates`)
        .expect(401);
    });
  });

  describe('GET /api/cities/:cityId/message-templates', () => {
    it('allows a city coordinator and returns defaults', async () => {
      currentUser = coordinatorA();
      const response = await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/message-templates`)
        .expect(200);

      expect(response.body.templates.length).toBeGreaterThan(0);
      expect(
        response.body.templates.find(
          (template: { key: string; locale: string }) =>
            template.key === 'day_invite' && template.locale === 'en'
        )
      ).toMatchObject({
        isCustom: false,
        title: defaultMessageCopyFor('day_invite', 'en').title,
        placeholders: ['date', 'startTime', 'endTime'],
      });
    });

    it('allows a super admin', async () => {
      currentUser = superAdmin();
      await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/message-templates`)
        .expect(200);
    });

    it('forbids a volunteer', async () => {
      currentUser = volunteerA();
      await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/message-templates`)
        .expect(403);
    });

    it('forbids a pending member', async () => {
      currentUser = pendingVolunteer();
      await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/message-templates`)
        .expect(403);
    });

    it('hides another city from a coordinator', async () => {
      currentUser = coordinatorB();
      await request(app.getHttpServer())
        .get(`/api/cities/${CITY_A_ID}/message-templates`)
        .expect(404);
    });
  });

  describe('PUT /api/cities/:cityId/message-templates/:key/:locale', () => {
    it('allows a coordinator to upsert a Holon template', async () => {
      currentUser = coordinatorA();
      mockPrisma.messageTemplate.upsert.mockResolvedValue({
        id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        cityId: CITY_A_ID,
        key: 'day_invite',
        locale: 'he',
        title: 'יום חלוקה בחולון',
        body: 'חולון {{date}}',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .put(`/api/cities/${CITY_A_ID}/message-templates/day_invite/he`)
        .send({
          title: 'יום חלוקה בחולון',
          body: 'חולון {{date}}',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        isCustom: true,
        title: 'יום חלוקה בחולון',
        body: 'חולון {{date}}',
      });
    });

    it('hides another city from a coordinator on upsert', async () => {
      currentUser = coordinatorB();
      await request(app.getHttpServer())
        .put(`/api/cities/${CITY_A_ID}/message-templates/day_invite/he`)
        .send({ title: 'x', body: 'y' })
        .expect(404);
    });

    it('rejects whitespace-only title and body with 400', async () => {
      currentUser = coordinatorA();
      await request(app.getHttpServer())
        .put(`/api/cities/${CITY_A_ID}/message-templates/day_invite/he`)
        .send({ title: '   ', body: '   ' })
        .expect(400);

      expect(mockPrisma.messageTemplate.upsert).not.toHaveBeenCalled();
    });

    it('rejects unknown placeholders with 400', async () => {
      currentUser = coordinatorA();
      await request(app.getHttpServer())
        .put(`/api/cities/${CITY_A_ID}/message-templates/day_invite/he`)
        .send({
          title: 'יום חלוקה',
          body: 'Broken {{dat}} and {{elderName}}',
        })
        .expect(400);

      expect(mockPrisma.messageTemplate.upsert).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/cities/:cityId/message-templates/:key/:locale', () => {
    it('allows a coordinator to reset a template', async () => {
      currentUser = coordinatorA();
      const response = await request(app.getHttpServer())
        .delete(`/api/cities/${CITY_A_ID}/message-templates/day_invite/en`)
        .expect(200);

      expect(response.body).toMatchObject({
        isCustom: false,
        title: defaultMessageCopyFor('day_invite', 'en').title,
      });
    });
  });
});
