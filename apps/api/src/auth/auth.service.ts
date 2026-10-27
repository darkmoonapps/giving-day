import { Injectable, UnauthorizedException } from '@nestjs/common';
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

    return await this.prisma.user.create({
      data: {
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        lastLoginAt: new Date(),
        identities: {
          create: {
            provider: profile.provider,
            providerSubject: profile.providerSubject,
          },
        },
      },
    });
  }

  async createSession(
    userId: string,
    userAgent: string,
    isCoordinator: boolean
  ): Promise<AuthTokens> {
    const refreshTokenTTL = isCoordinator ? 14 : 90;
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

  async refreshAccessToken(refreshToken: string): Promise<string> {
    const sessions = await this.prisma.session.findMany({
      where: {
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    for (const session of sessions) {
      const isValid = await bcrypt.compare(
        refreshToken,
        session.refreshTokenHash
      );
      if (isValid) {
        return this.generateAccessToken(session.userId);
      }
    }

    throw new UnauthorizedException('Invalid refresh token');
  }

  async revokeSession(userId: string, refreshToken: string): Promise<void> {
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
