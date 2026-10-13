import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import type { HealthResponse } from '@giving-day/shared';

async function createApp(
  overridePrisma?: Partial<PrismaService>
): Promise<INestApplication> {
  let builder = Test.createTestingModule({
    imports: [AppModule],
  });

  if (overridePrisma) {
    builder = builder.overrideProvider(PrismaService).useValue(overridePrisma);
  }

  const moduleFixture: TestingModule = await builder.compile();
  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  await app.init();
  return app;
}

describe('GET /api/health (disconnected database)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp({
      isConnected: async () => false,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with unhealthy status and disconnected database', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);

    const body = response.body as HealthResponse;
    expect(body).toEqual({
      status: 'unhealthy',
      timestamp: expect.any(String),
      database: {
        connected: false,
      },
    });
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });
});

describe.skipIf(!process.env.DATABASE_URL)(
  'GET /api/health (connected database)',
  () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createApp();
    });

    afterAll(async () => {
      await app.close();
    });

    it('returns 200 with healthy status and connected database', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      const body = response.body as HealthResponse;
      expect(body).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
        database: {
          connected: true,
        },
      });
      expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
    });
  }
);
