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
import { VOLUNTEER_A_ID, coordinatorA, volunteerA } from '../test/fake-users';

describe('Push subscriptions HTTP', () => {
  let app: INestApplication;
  let currentUser: UserWithMemberships | null = null;

  const row = {
    id: '44444444-4444-4444-8444-444444444444',
    createdAt: new Date('2026-10-28T09:00:00.000Z'),
    updatedAt: new Date('2026-10-28T09:00:00.000Z'),
    userId: VOLUNTEER_A_ID,
    endpoint: 'https://push.example.com/fake-subscription',
    p256dh: 'fake-p256dh-key',
    auth: 'fake-auth-secret',
    userAgent: 'Mozilla/5.0 GivingDayTest',
    lastSuccessAt: null,
    failedCount: 0,
    disabledAt: null,
  };

  const mockPrisma = {
    isConnected: vi.fn().mockResolvedValue(false),
    pushSubscription: {
      findMany: vi.fn().mockResolvedValue([row]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(row),
      update: vi.fn(),
      delete: vi.fn().mockResolvedValue(row),
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
    mockPrisma.pushSubscription.findUnique.mockResolvedValue(null);
    mockPrisma.pushSubscription.findMany.mockResolvedValue([row]);
    mockPrisma.pushSubscription.create.mockResolvedValue(row);
  });

  it('rejects unauthenticated access', async () => {
    await request(app.getHttpServer())
      .get('/api/push-subscriptions/vapid-public-key')
      .expect(401);
  });

  it('lets a volunteer upsert their own subscription', async () => {
    currentUser = volunteerA();
    const response = await request(app.getHttpServer())
      .post('/api/push-subscriptions')
      .send({
        endpoint: row.endpoint,
        p256dh: row.p256dh,
        auth: row.auth,
        userAgent: row.userAgent,
      })
      .expect(201);

    expect(response.body.endpoint).toBe(row.endpoint);
    expect(response.body.p256dh).toBeUndefined();
    expect(response.body.auth).toBeUndefined();
  });

  it('lets a coordinator persist their own device subscription', async () => {
    currentUser = coordinatorA();
    mockPrisma.pushSubscription.create.mockResolvedValue({
      ...row,
      userId: coordinatorA().id,
    });

    await request(app.getHttpServer())
      .post('/api/push-subscriptions')
      .send({
        endpoint: 'https://push.example.com/coordinator-device',
        p256dh: 'fake-p256dh-key',
        auth: 'fake-auth-secret',
      })
      .expect(201);
  });

  it('returns unconfigured VAPID keys in tests', async () => {
    currentUser = volunteerA();
    const response = await request(app.getHttpServer())
      .get('/api/push-subscriptions/vapid-public-key')
      .expect(200);

    expect(response.body).toEqual({ publicKey: null, configured: false });
  });
});
