import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { AppModule } from '../app.module';
import { configureApp } from '../configure-app';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

describe('Confirm reminders job HTTP', () => {
  let app: INestApplication;
  const previousSecret = process.env.CRON_SECRET;

  const mockNotifications = {
    sendConfirmReminders: vi.fn(),
    announceDistributionDay: vi.fn(),
  };

  const mockPrisma = {
    isConnected: vi.fn().mockResolvedValue(false),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(NotificationsService)
      .useValue(mockNotifications)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    if (previousSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = previousSecret;
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'holon-cron-test-secret';
    mockNotifications.sendConfirmReminders.mockResolvedValue({
      attempted: 2,
      sent: 1,
      failed: 0,
      skipped: 1,
      daysProcessed: 1,
    });
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it('rejects requests without a cron secret', async () => {
    await request(app.getHttpServer())
      .post('/api/jobs/confirm-reminders')
      .expect(401);
  });

  it('returns 503 when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET;

    await request(app.getHttpServer())
      .post('/api/jobs/confirm-reminders')
      .set('Authorization', 'Bearer holon-cron-test-secret')
      .expect(503);
  });

  it('runs the idempotent confirm-reminders job with a Bearer secret', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/jobs/confirm-reminders')
      .set('Authorization', 'Bearer holon-cron-test-secret')
      .expect(200);

    expect(response.body).toEqual({
      attempted: 2,
      sent: 1,
      failed: 0,
      skipped: 1,
      daysProcessed: 1,
    });
    expect(mockNotifications.sendConfirmReminders).toHaveBeenCalledOnce();
  });

  it('accepts X-Cron-Secret as an alternative credential', async () => {
    await request(app.getHttpServer())
      .post('/api/jobs/confirm-reminders')
      .set('X-Cron-Secret', 'holon-cron-test-secret')
      .expect(200);

    expect(mockNotifications.sendConfirmReminders).toHaveBeenCalledOnce();
  });
});
