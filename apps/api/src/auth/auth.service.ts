import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import type {
  AuthProvider,
  User,
  Session,
  CityMembership,
} from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email?: string;
  iat?: number;
  exp?: number;
}

export interface SocialProfile {
  provider: AuthProvider;
  providerSubject: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SessionWithUser extends Session {
  user: User & {
    memberships: CityMembership[];
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async validateOrCreateUser(profile: SocialProfile): Promise<User> {
    const existingIdentity = await this.prisma.authIdentity.findUnique({
      where: {
        provider_providerSubject: {
          provider: profile.provider,
          providerSubject: profile.providerSubject,
        },
      },
      include: { user: true },
    });

    if (existingIdentity) {
      await this.prisma.user.update({
        where: { id: existingIdentity.userId },
        data: { lastLoginAt: new Date() },
      });
      return existingIdentity.user;
    }

    const createdUser = await this.prisma.user.create({
      data: {
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        lastLoginAt: new Date(),
      },
    });

    await this.prisma.authIdentity.create({
      data: {
        userId: createdUser.id,
        provider: profile.provider,
        providerSubject: profile.providerSubject,
      },
    });

    return createdUser;
  }

  async createSession(userId: string, userAgent: string): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { status: 'active' },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('auth.user_not_found');
    }

    const hasActiveCoordinatorRole = user.memberships.some(
      (m) => m.role === 'coordinator' && m.status === 'active'
    );

    const refreshTokenTTL = hasActiveCoordinatorRole ? 14 : 90;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshTokenTTL);

    const refreshToken = this.generateRefreshToken();
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash,
        userAgent,
        expiresAt,
      },
    });

    const accessToken = this.generateAccessToken(userId);

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    if (!refreshToken) {
      throw new UnauthorizedException('auth.refresh_token_required');
    }

    const sessions = await this.prisma.session.findMany({
      where: {
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          include: {
            memberships: {
              where: { status: 'active' },
            },
          },
        },
      },
    });

    for (const session of sessions) {
      const isValid = await bcrypt.compare(
        refreshToken,
        session.refreshTokenHash
      );

      if (isValid) {
        await this.prisma.session.update({
          where: { id: session.id },
          data: { revokedAt: new Date() },
        });

        const hasActiveCoordinatorRole = session.user.memberships.some(
          (m) => m.role === 'coordinator' && m.status === 'active'
        );

        const refreshTokenTTL = hasActiveCoordinatorRole ? 14 : 90;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + refreshTokenTTL);

        const newRefreshToken = this.generateRefreshToken();
        const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);

        await this.prisma.session.create({
          data: {
            userId: session.userId,
            refreshTokenHash: newRefreshTokenHash,
            userAgent: session.userAgent,
            expiresAt,
          },
        });

        const newAccessToken = this.generateAccessToken(session.userId);

        return {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        };
      }
    }

    throw new UnauthorizedException('auth.invalid_refresh_token');
  }

  async revokeSession(userId: string, refreshToken: string): Promise<void> {
    if (!refreshToken) {
      return;
    }

    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
      },
    });

    for (const session of sessions) {
      const isValid = await bcrypt.compare(
        refreshToken,
        session.refreshTokenHash
      );
      if (isValid) {
        await this.prisma.session.update({
          where: { id: session.id },
          data: { revokedAt: new Date() },
        });
        return;
      }
    }
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  async validateJwtPayload(payload: JwtPayload): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        memberships: {
          where: {
            status: 'active',
          },
          include: {
            city: true,
          },
        },
      },
    });
  }

  async getUserWithMemberships(
    userId: string
  ): Promise<(User & { memberships: CityMembership[] }) | null> {
    return await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: {
            status: 'active',
          },
          include: {
            city: true,
          },
        },
      },
    });
  }

  async completeOnboarding(
    userId: string,
    data: {
      firstName: string;
      lastName: string;
      phone: string;
      birthDate?: Date;
      locale?: 'he' | 'en';
    }
  ): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('auth.user_not_found');
    }

    if (user.onboardedAt) {
      throw new BadRequestException('auth.already_onboarded');
    }

    return await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        onboardedAt: new Date(),
      },
    });
  }

  private generateAccessToken(userId: string): string {
    const payload: JwtPayload = { sub: userId };
    return this.jwtService.sign(payload);
  }

  private generateRefreshToken(): string {
    const randomBytes = Buffer.from(
      Array.from({ length: 32 }, () => Math.floor(Math.random() * 256))
    );
    return randomBytes.toString('base64url');
  }
}
