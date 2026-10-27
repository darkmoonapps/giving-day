import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

vi.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    authIdentity: {
      findUnique: vi.fn(),
    },
    user: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    session: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };

  const mockJwtService = {
    sign: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);

    vi.clearAllMocks();
  });

  describe('validateOrCreateUser', () => {
    it('should return existing user when identity exists', async () => {
      const mockUser = {
        id: 'user-id-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        lastLoginAt: new Date(),
      };

      mockPrismaService.authIdentity.findUnique.mockResolvedValue({
        id: 'identity-id-1',
        userId: 'user-id-1',
        provider: 'google',
        providerSubject: 'google-sub-123',
        user: mockUser,
      });

      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.validateOrCreateUser({
        provider: 'google',
        providerSubject: 'google-sub-123',
        email: 'test@example.com',
      });

      expect(result).toEqual(mockUser);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id-1' },
        data: { lastLoginAt: expect.any(Date) },
      });
    });

    it('should create new user when identity does not exist', async () => {
      mockPrismaService.authIdentity.findUnique.mockResolvedValue(null);

      const newUser = {
        id: 'new-user-id',
        email: 'new@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        lastLoginAt: new Date(),
      };

      mockPrismaService.user.create.mockResolvedValue(newUser);

      const result = await service.validateOrCreateUser({
        provider: 'facebook',
        providerSubject: 'facebook-sub-456',
        email: 'new@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
      });

      expect(result).toEqual(newUser);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: 'new@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          lastLoginAt: expect.any(Date),
          identities: {
            create: {
              provider: 'facebook',
              providerSubject: 'facebook-sub-456',
            },
          },
        },
      });
    });
  });

  describe('createSession', () => {
    it('should create session with correct TTL for volunteer', async () => {
      const userId = 'user-123';
      const userAgent = 'test-agent';
      const isCoordinator = false;

      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-token' as never);
      mockJwtService.sign.mockReturnValue('access-token');
      mockPrismaService.session.create.mockResolvedValue({
        id: 'session-id',
        userId,
      });

      const result = await service.createSession(
        userId,
        userAgent,
        isCoordinator
      );

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBeDefined();
      expect(prismaService.session.create).toHaveBeenCalledWith({
        data: {
          userId,
          refreshTokenHash: 'hashed-token',
          userAgent,
          expiresAt: expect.any(Date),
        },
      });
    });

    it('should create session with shorter TTL for coordinator', async () => {
      const userId = 'coord-123';
      const userAgent = 'test-agent';
      const isCoordinator = true;

      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-token' as never);
      mockJwtService.sign.mockReturnValue('access-token');
      mockPrismaService.session.create.mockResolvedValue({
        id: 'session-id',
        userId,
      });

      await service.createSession(userId, userAgent, isCoordinator);

      const createCall = mockPrismaService.session.create.mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt as Date;
      const daysDiff = Math.round(
        (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBe(14);
    });
  });

  describe('completeOnboarding', () => {
    it('should update user with onboarding data', async () => {
      const userId = 'user-id';
      const onboardingData = {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+972501234567',
        locale: 'he' as const,
      };

      const updatedUser = {
        id: userId,
        ...onboardingData,
        onboardedAt: new Date(),
      };

      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.completeOnboarding(userId, onboardingData);

      expect(result).toEqual(updatedUser);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          ...onboardingData,
          onboardedAt: expect.any(Date),
        },
      });
    });
  });

  describe('refreshAccessToken', () => {
    it('should generate new access token for valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const userId = 'user-123';

      mockPrismaService.session.findMany.mockResolvedValue([
        {
          id: 'session-id',
          userId,
          refreshTokenHash: 'hashed-token',
          revokedAt: null,
          expiresAt: new Date(Date.now() + 86400000),
        },
      ]);

      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      mockJwtService.sign.mockReturnValue('new-access-token');

      const result = await service.refreshAccessToken(refreshToken);

      expect(result).toBe('new-access-token');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockPrismaService.session.findMany.mockResolvedValue([
        {
          refreshTokenHash: 'hashed-token',
          revokedAt: null,
          expiresAt: new Date(Date.now() + 86400000),
        },
      ]);

      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(service.refreshAccessToken('invalid-token')).rejects.toThrow(
        'Invalid refresh token'
      );
    });
  });

  describe('revokeSession', () => {
    it('should revoke session with matching refresh token', async () => {
      const userId = 'user-123';
      const refreshToken = 'valid-token';

      mockPrismaService.session.findMany.mockResolvedValue([
        {
          id: 'session-id',
          userId,
          refreshTokenHash: 'hashed-token',
          revokedAt: null,
        },
      ]);

      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      mockPrismaService.session.update.mockResolvedValue({} as never);

      await service.revokeSession(userId, refreshToken);

      expect(prismaService.session.update).toHaveBeenCalledWith({
        where: { id: 'session-id' },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('revokeAllUserSessions', () => {
    it('should revoke all active sessions for user', async () => {
      const userId = 'user-123';

      mockPrismaService.session.updateMany.mockResolvedValue({
        count: 3,
      });

      await service.revokeAllUserSessions(userId);

      expect(prismaService.session.updateMany).toHaveBeenCalledWith({
        where: {
          userId,
          revokedAt: null,
        },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
});
