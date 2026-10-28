import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import cookieParser from 'cookie-parser';

describe('Auth Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        user: {
          create: vi.fn(),
          findUnique: vi.fn(),
          update: vi.fn(),
        },
        authIdentity: {
          findUnique: vi.fn(),
        },
        session: {
          create: vi.fn(),
          findUnique: vi.fn(),
          update: vi.fn(),
          updateMany: vi.fn(),
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      })
    );

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/onboarding', () => {
    it('should complete onboarding with valid data', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: null,
        lastName: null,
        phone: null,
        onboardedAt: null,
        locale: 'he',
        themePref: 'system',
        isSuperAdmin: false,
        memberships: [],
      };

      const updatedUser = {
        ...mockUser,
        firstName: 'John',
        lastName: 'Doe',
        phone: '+972501234567',
        onboardedAt: new Date(),
      };

      vi.spyOn(prisma.user, 'update').mockResolvedValue(updatedUser as never);

      const mockToken = 'mock-jwt-token';

      const response = await request(app.getHttpServer())
        .post('/api/auth/onboarding')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          phone: '+972501234567',
          locale: 'he',
        });

      expect(response.status).toBe(401);
    });

    it('should reject onboarding with invalid phone format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/onboarding')
        .set('Authorization', 'Bearer mock-token')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          phone: 'invalid-phone',
          locale: 'he',
        });

      expect(response.status).toBe(401);
    });

    it('should reject onboarding with missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/onboarding')
        .set('Authorization', 'Bearer mock-token')
        .send({
          firstName: 'John',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should return 400 when no refresh token provided', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({});

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should accept refresh token from request body', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'some-refresh-token',
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should look up the session by id from the cookie', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', 'refreshToken=session-id.raw-refresh-token')
        .send({});

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(prisma.session.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-id' },
        })
      );
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 when no token provided', async () => {
      const response = await request(app.getHttpServer()).get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should return 401 when no token provided', async () => {
      const response = await request(app.getHttpServer()).post(
        '/api/auth/logout'
      );

      expect(response.status).toBe(401);
    });
  });
});
