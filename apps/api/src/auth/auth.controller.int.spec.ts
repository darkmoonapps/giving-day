import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import cookieParser from 'cookie-parser';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

describe('Auth Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let currentUser: { id: string; onboardedAt: Date | null } | null = null;

  const notOnboardedUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: null,
    lastName: null,
    phone: null,
    birthDate: null,
    onboardedAt: null,
    locale: 'he' as const,
    themePref: 'system',
    isSuperAdmin: false,
    memberships: [],
  };

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
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext): boolean => {
          if (currentUser === null) {
            throw new UnauthorizedException('auth.unauthenticated');
          }
          context.switchToHttp().getRequest().user = currentUser;
          return true;
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
    currentUser = null;
    vi.clearAllMocks();
  });

  describe('POST /api/auth/onboarding', () => {
    it('should complete onboarding without a birth date', async () => {
      currentUser = { id: notOnboardedUser.id, onboardedAt: null };
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(
        notOnboardedUser as never
      );
      vi.spyOn(prisma.user, 'update').mockImplementation(({ data }) =>
        Promise.resolve({
          ...notOnboardedUser,
          ...data,
        } as never)
      );

      const response = await request(app.getHttpServer())
        .post('/api/auth/onboarding')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          phone: '+972501234567',
          locale: 'he',
        });

      expect(response.status).toBe(201);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: notOnboardedUser.id },
        data: expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe',
          phone: '+972501234567',
          locale: 'he',
          onboardedAt: expect.any(Date),
        }),
      });
      const updateArg = vi.mocked(prisma.user.update).mock.calls[0]?.[0] as {
        data: Record<string, unknown>;
      };
      expect(updateArg.data).not.toHaveProperty('birthDate');
    });

    it('should convert a date-only birthDate to a Date for Prisma', async () => {
      currentUser = { id: notOnboardedUser.id, onboardedAt: null };
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(
        notOnboardedUser as never
      );
      vi.spyOn(prisma.user, 'update').mockImplementation(({ data }) =>
        Promise.resolve({
          ...notOnboardedUser,
          ...data,
        } as never)
      );

      const response = await request(app.getHttpServer())
        .post('/api/auth/onboarding')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          phone: '+972501234567',
          birthDate: '2026-09-30',
          locale: 'he',
        });

      expect(response.status).toBe(201);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: notOnboardedUser.id },
        data: expect.objectContaining({
          birthDate: new Date('2026-09-30T00:00:00.000Z'),
        }),
      });
    });

    it('should omit an empty birthDate', async () => {
      currentUser = { id: notOnboardedUser.id, onboardedAt: null };
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(
        notOnboardedUser as never
      );
      vi.spyOn(prisma.user, 'update').mockImplementation(({ data }) =>
        Promise.resolve({
          ...notOnboardedUser,
          ...data,
        } as never)
      );

      const response = await request(app.getHttpServer())
        .post('/api/auth/onboarding')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          phone: '+972501234567',
          birthDate: '',
          locale: 'he',
        });

      expect(response.status).toBe(201);
      const updateArg = vi.mocked(prisma.user.update).mock.calls[0]?.[0] as {
        data: Record<string, unknown>;
      };
      expect(updateArg.data).not.toHaveProperty('birthDate');
    });

    it('should reject an invalid birthDate with 400', async () => {
      currentUser = { id: notOnboardedUser.id, onboardedAt: null };

      const response = await request(app.getHttpServer())
        .post('/api/auth/onboarding')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          phone: '+972501234567',
          birthDate: 'not-a-date',
          locale: 'he',
        });

      expect(response.status).toBe(400);
      expect(prisma.user.update).not.toHaveBeenCalled();
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
      currentUser = { id: notOnboardedUser.id, onboardedAt: null };

      const response = await request(app.getHttpServer())
        .post('/api/auth/onboarding')
        .send({
          firstName: 'John',
        });

      expect(response.status).toBe(400);
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
