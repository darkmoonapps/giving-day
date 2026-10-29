import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
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
      create: vi.fn(),
    },
    user: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
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
      mockPrismaService.authIdentity.create.mockResolvedValue({});

      const result = await service.validateOrCreateUser({
        provider: 'facebook',
        providerSubject: 'facebook-sub-456',
        email: 'new@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
      });

      expect(result).toEqual(newUser);
      expect(prismaService.user.create).toHaveBeenCalled();
      expect(prismaService.authIdentity.create).toHaveBeenCalled();
    });
  });

  describe('createSession', () => {
    it('should create session with correct TTL for volunteer', async () => {
      const userId = 'user-123';
      const userAgent = 'test-agent';

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        memberships: [],
      });

      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-token' as never);
      mockJwtService.sign.mockReturnValue('access-token');
      mockPrismaService.session.create.mockResolvedValue({
        id: 'session-id',
        userId,
        refreshTokenHash: 'hashed-token',
        userAgent,
        expiresAt: new Date(),
      });

      const result = await service.createSession(userId, userAgent);

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.sessionId).toBe('session-id');
      expect(prismaService.session.create).toHaveBeenCalledWith({
        data: {
          userId,
          refreshTokenHash: 'hashed-token',
          userAgent,
          expiresAt: expect.any(Date),
        },
      });

      const createCall = mockPrismaService.session.create.mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt as Date;
      const daysDiff = Math.round(
        (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBe(90);
    });

    it('should create session with shorter TTL for active coordinator', async () => {
      const userId = 'coord-123';
      const userAgent = 'test-agent';

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        memberships: [
          {
            role: 'coordinator',
            status: 'active',
          },
        ],
      });

      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-token' as never);
      mockJwtService.sign.mockReturnValue('access-token');
      mockPrismaService.session.create.mockResolvedValue({
        id: 'session-id',
        userId,
      });

      await service.createSession(userId, userAgent);

      const createCall = mockPrismaService.session.create.mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt as Date;
      const daysDiff = Math.round(
        (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBe(14);
    });

    it('should use volunteer TTL for pending coordinator membership', async () => {
      const userId = 'pending-coord-123';
      const userAgent = 'test-agent';

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        memberships: [
          {
            role: 'coordinator',
            status: 'pending',
          },
        ],
      });

      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-token' as never);
      mockJwtService.sign.mockReturnValue('access-token');
      mockPrismaService.session.create.mockResolvedValue({
        id: 'session-id',
        userId,
      });

      await service.createSession(userId, userAgent);

      const createCall = mockPrismaService.session.create.mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt as Date;
      const daysDiff = Math.round(
        (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBe(90);
    });
  });

  describe('refreshAccessToken', () => {
    it('should generate new tokens for valid refresh token', async () => {
      const sessionId = 'session-123';
      const refreshToken = 'valid-refresh-token';
      const userId = 'user-123';

      mockPrismaService.session.findUnique.mockResolvedValue({
        id: sessionId,
        userId,
        refreshTokenHash: 'hashed-token',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
        userAgent: 'test-agent',
        user: {
          id: userId,
          memberships: [],
        },
      });

      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(bcrypt.hash).mockResolvedValue('new-hashed-token' as never);
      mockJwtService.sign.mockReturnValue('new-access-token');

      mockPrismaService.session.update.mockResolvedValue({} as never);
      mockPrismaService.session.create.mockResolvedValue({
        id: 'new-session-id',
        userId,
      });

      const result = await service.refreshAccessToken(sessionId, refreshToken);

      expect(result.accessToken).toBe('new-access-token');
      expect(result.sessionId).toBe('new-session-id');
      expect(prismaService.session.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: { revokedAt: expect.any(Date) },
      });
      expect(prismaService.session.create).toHaveBeenCalled();
    });

    it('should throw and revoke all sessions on token reuse', async () => {
      const sessionId = 'session-123';
      const refreshToken = 'reused-token';
      const userId = 'user-123';

      mockPrismaService.session.findUnique.mockResolvedValue({
        id: sessionId,
        userId,
        refreshTokenHash: 'hashed-token',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      });

      mockPrismaService.session.updateMany.mockResolvedValue({ count: 2 });

      await expect(
        service.refreshAccessToken(sessionId, refreshToken)
      ).rejects.toThrow(UnauthorizedException);

      expect(prismaService.session.updateMany).toHaveBeenCalledWith({
        where: {
          userId,
          revokedAt: null,
        },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should throw and revoke all sessions for invalid token', async () => {
      const sessionId = 'session-123';
      const refreshToken = 'invalid-token';
      const userId = 'user-123';

      mockPrismaService.session.findUnique.mockResolvedValue({
        id: sessionId,
        userId,
        refreshTokenHash: 'hashed-token',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
        user: {
          id: userId,
          memberships: [],
        },
      });

      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
      mockPrismaService.session.updateMany.mockResolvedValue({ count: 2 });

      await expect(
        service.refreshAccessToken(sessionId, refreshToken)
      ).rejects.toThrow(UnauthorizedException);

      expect(prismaService.session.updateMany).toHaveBeenCalled();
    });

    it('should reject expired sessions without revoking other sessions', async () => {
      const sessionId = 'session-123';
      const refreshToken = 'expired-token';

      mockPrismaService.session.findUnique.mockResolvedValue({
        id: sessionId,
        userId: 'user-123',
        refreshTokenHash: 'hashed-token',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
        user: {
          id: 'user-123',
          memberships: [],
        },
      });

      await expect(
        service.refreshAccessToken(sessionId, refreshToken)
      ).rejects.toThrow(UnauthorizedException);

      expect(prismaService.session.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('revokeSession', () => {
    it('should revoke session with matching refresh token', async () => {
      const sessionId = 'session-123';
      const refreshToken = 'valid-token';

      mockPrismaService.session.findUnique.mockResolvedValue({
        id: sessionId,
        refreshTokenHash: 'hashed-token',
        revokedAt: null,
      });

      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      mockPrismaService.session.update.mockResolvedValue({} as never);

      await service.revokeSession(sessionId, refreshToken);

      expect(prismaService.session.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should not revoke session for invalid refresh token', async () => {
      const sessionId = 'session-123';
      const refreshToken = 'invalid-token';

      mockPrismaService.session.findUnique.mockResolvedValue({
        id: sessionId,
        refreshTokenHash: 'hashed-token',
        revokedAt: null,
      });

      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await service.revokeSession(sessionId, refreshToken);

      expect(prismaService.session.update).not.toHaveBeenCalled();
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

  describe('completeOnboarding', () => {
    it('should update user with onboarding data', async () => {
      const userId = 'user-id';
      const onboardingData = {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+972501234567',
        locale: 'he' as const,
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        onboardedAt: null,
      });

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
          firstName: 'John',
          lastName: 'Doe',
          phone: '+972501234567',
          locale: 'he',
          onboardedAt: expect.any(Date),
        },
      });
    });

    it('converts a date-only birthDate into a Date for Prisma', async () => {
      const userId = 'user-id';
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        onboardedAt: null,
      });
      mockPrismaService.user.update.mockResolvedValue({ id: userId });

      await service.completeOnboarding(userId, {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+972501234567',
        birthDate: '2026-09-30',
        locale: 'he',
      });

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          firstName: 'John',
          lastName: 'Doe',
          phone: '+972501234567',
          locale: 'he',
          onboardedAt: expect.any(Date),
          birthDate: new Date('2026-09-30T00:00:00.000Z'),
        },
      });
    });

    it('omits an empty birthDate so Prisma does not receive a date-only string', async () => {
      const userId = 'user-id';
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        onboardedAt: null,
      });
      mockPrismaService.user.update.mockResolvedValue({ id: userId });

      await service.completeOnboarding(userId, {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+972501234567',
        birthDate: '',
      });

      const updateArg = mockPrismaService.user.update.mock.calls[0]?.[0] as {
        data: Record<string, unknown>;
      };
      expect(updateArg.data).not.toHaveProperty('birthDate');
    });

    it('rejects an invalid birthDate before calling Prisma', async () => {
      const userId = 'user-id';
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        onboardedAt: null,
      });

      await expect(
        service.completeOnboarding(userId, {
          firstName: 'John',
          lastName: 'Doe',
          phone: '+972501234567',
          birthDate: 'not-a-date',
        })
      ).rejects.toThrow(BadRequestException);
      expect(prismaService.user.update).not.toHaveBeenCalled();
    });

    it('should throw if user already onboarded', async () => {
      const userId = 'user-id';
      const onboardingData = {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+972501234567',
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        onboardedAt: new Date(),
      });

      await expect(
        service.completeOnboarding(userId, onboardingData)
      ).rejects.toThrow(BadRequestException);
    });
  });
});
