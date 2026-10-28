import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import {
  cityCoordinatorsResponseSchema,
  cityJoinLinkSchema,
  cityJoinLinksResponseSchema,
  citySettingsExtraSchema,
  citySettingsSchema,
  type CityCoordinator,
  type CityCoordinatorsResponse,
  type CityJoinLink,
  type CityJoinLinksResponse,
  type CitySettings,
} from '@giving-day/shared';
import {
  CityRole,
  Prisma,
  type CityInvite,
  type CityMembership,
  type CitySettings as PrismaCitySettings,
  type User,
} from '@prisma/client';
import {
  AbilityFactory,
  type UserWithMemberships,
} from '../abilities/ability.factory';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { assertCanOnCity } from './city-access';
import type { AddCoordinatorDto } from './dto/add-coordinator.dto';
import type { UpdateCitySettingsDto } from './dto/update-city-settings.dto';

type MembershipWithUser = CityMembership & {
  user: Pick<
    User,
    'id' | 'firstName' | 'lastName' | 'email' | 'phone' | 'archivedAt'
  >;
};

@Injectable()
export class CitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly abilityFactory: AbilityFactory,
    private readonly authService: AuthService
  ) {}

  async getSettings(
    cityId: string,
    actor: UserWithMemberships
  ): Promise<CitySettings> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'read', 'CitySettings', cityId);
    await this.requireCity(cityId);

    const settings = await this.prisma.citySettings.findUnique({
      where: { cityId },
    });
    if (!settings) {
      throw new NotFoundException('cities.not_found');
    }

    return this.toSettingsDto(settings);
  }

  async updateSettings(
    cityId: string,
    dto: UpdateCitySettingsDto,
    actor: UserWithMemberships
  ): Promise<CitySettings> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'update', 'CitySettings', cityId);
    await this.requireCity(cityId);

    const existing = await this.prisma.citySettings.findUnique({
      where: { cityId },
    });

    if (!existing) {
      if (
        dto.centerAddress === undefined ||
        dto.centerLat === undefined ||
        dto.centerLng === undefined
      ) {
        throw new BadRequestException('cities.settings_incomplete');
      }
    }

    const nextStart = dto.defaultStartTime
      ? this.normalizeTime(dto.defaultStartTime)
      : existing
        ? this.formatTime(existing.defaultStartTime)
        : '09:00:00';
    const nextEnd = dto.defaultEndTime
      ? this.normalizeTime(dto.defaultEndTime)
      : existing
        ? this.formatTime(existing.defaultEndTime)
        : '14:00:00';

    if (this.timeToSeconds(nextStart) >= this.timeToSeconds(nextEnd)) {
      throw new BadRequestException('cities.invalid_time_range');
    }

    let extra: Record<string, unknown>;
    if (dto.extra === undefined) {
      extra = existing ? this.toExtra(existing.extra) : {};
    } else {
      const parsedExtra = citySettingsExtraSchema.safeParse(dto.extra);
      if (!parsedExtra.success) {
        throw new BadRequestException('cities.invalid_extra');
      }
      extra = parsedExtra.data;
    }

    const data = {
      centerAddress: dto.centerAddress ?? existing?.centerAddress ?? '',
      centerLat: dto.centerLat ?? this.toNumber(existing?.centerLat) ?? 0,
      centerLng: dto.centerLng ?? this.toNumber(existing?.centerLng) ?? 0,
      defaultStartTime: this.parseTime(nextStart),
      defaultEndTime: this.parseTime(nextEnd),
      confirmReminderAfterHours:
        dto.confirmReminderAfterHours ??
        existing?.confirmReminderAfterHours ??
        24,
      unpickedPushMinutesBeforeEnd:
        dto.unpickedPushMinutesBeforeEnd ??
        existing?.unpickedPushMinutesBeforeEnd ??
        60,
      missingFinalStatusWaitHours:
        dto.missingFinalStatusWaitHours ??
        existing?.missingFinalStatusWaitHours ??
        72,
      defaultLocale: dto.defaultLocale ?? existing?.defaultLocale ?? 'he',
      defaultTheme:
        dto.defaultTheme ?? existing?.defaultTheme ?? 'wisteria-mint',
      orgName:
        dto.orgName === undefined ? (existing?.orgName ?? null) : dto.orgName,
      logoUrl:
        dto.logoUrl === undefined ? (existing?.logoUrl ?? null) : dto.logoUrl,
      extra: extra as Prisma.InputJsonValue,
    };

    const saved = existing
      ? await this.prisma.citySettings.update({
          where: { cityId },
          data,
        })
      : await this.prisma.citySettings.create({
          data: { cityId, ...data },
        });

    return this.toSettingsDto(saved);
  }

  async listJoinLinks(
    cityId: string,
    actor: UserWithMemberships
  ): Promise<CityJoinLinksResponse> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'read', 'CityInvite', cityId);
    await this.requireCity(cityId);

    const invites = await this.prisma.cityInvite.findMany({
      where: { cityId, revokedAt: null },
      orderBy: { role: 'asc' },
    });

    return cityJoinLinksResponseSchema.parse({
      links: invites.map((invite) => this.toJoinLinkDto(invite)),
    });
  }

  async regenerateJoinLink(
    cityId: string,
    role: CityRole,
    actor: UserWithMemberships
  ): Promise<CityJoinLink> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'create', 'CityInvite', cityId);
    assertCanOnCity(ability, 'delete', 'CityInvite', cityId);
    await this.requireCity(cityId);

    // CityInvite.tokenHash stores the public shareable code so coordinators
    // can retrieve the current WhatsApp URL. This is a join code, not a
    // password; hashing it would make GET current-link impossible without a
    // schema change.
    const token = this.generateJoinToken();
    const invite = await this.prisma.$transaction(async (tx) => {
      await tx.cityInvite.updateMany({
        where: { cityId, role, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      return tx.cityInvite.create({
        data: {
          cityId,
          role,
          tokenHash: token,
          createdById: actor.id,
        },
      });
    });

    return this.toJoinLinkDto(invite);
  }

  async listCoordinators(
    cityId: string,
    actor: UserWithMemberships
  ): Promise<CityCoordinatorsResponse> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'read', 'CityMembership', cityId);
    await this.requireCity(cityId);

    const memberships = await this.prisma.cityMembership.findMany({
      where: {
        cityId,
        role: 'coordinator',
        status: { in: ['active', 'pending'] },
        user: { archivedAt: null },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            archivedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return cityCoordinatorsResponseSchema.parse({
      coordinators: memberships.map((membership) =>
        this.toCoordinatorDto(membership)
      ),
    });
  }

  async addCoordinator(
    cityId: string,
    dto: AddCoordinatorDto,
    actor: UserWithMemberships
  ): Promise<CityCoordinator> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'create', 'CityMembership', cityId, {
      role: 'coordinator',
    });
    await this.requireCity(cityId);

    if (!dto.userId && !dto.email) {
      throw new BadRequestException('cities.user_id_or_email_required');
    }

    const user = dto.userId
      ? await this.prisma.user.findUnique({ where: { id: dto.userId } })
      : await this.prisma.user.findFirst({
          where: { email: dto.email },
        });

    if (!user || user.archivedAt) {
      throw new NotFoundException('cities.user_not_found');
    }

    const existing = await this.prisma.cityMembership.findUnique({
      where: {
        cityId_userId: { cityId, userId: user.id },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            archivedAt: true,
          },
        },
      },
    });

    if (existing?.role === 'coordinator' && existing.status === 'active') {
      throw new ConflictException('cities.already_coordinator');
    }

    const now = new Date();
    const saved = existing
      ? await this.prisma.cityMembership.update({
          where: { id: existing.id },
          data: {
            role: 'coordinator',
            status: 'active',
            approvedById: actor.id,
            approvedAt: now,
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                archivedAt: true,
              },
            },
          },
        })
      : await this.prisma.cityMembership.create({
          data: {
            cityId,
            userId: user.id,
            role: 'coordinator',
            status: 'active',
            approvedById: actor.id,
            approvedAt: now,
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                archivedAt: true,
              },
            },
          },
        });

    return this.toCoordinatorDto(saved);
  }

  async removeCoordinator(
    cityId: string,
    userId: string,
    actor: UserWithMemberships
  ): Promise<void> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'delete', 'CityMembership', cityId);
    await this.requireCity(cityId);

    const membership = await this.prisma.cityMembership.findUnique({
      where: {
        cityId_userId: { cityId, userId },
      },
    });

    if (
      !membership ||
      membership.role !== 'coordinator' ||
      membership.status === 'removed'
    ) {
      throw new NotFoundException('cities.not_found');
    }

    if (membership.status === 'active') {
      const activeCount = await this.prisma.cityMembership.count({
        where: {
          cityId,
          role: 'coordinator',
          status: 'active',
        },
      });
      if (activeCount <= 1) {
        throw new BadRequestException('cities.last_coordinator');
      }
    }

    await this.prisma.cityMembership.update({
      where: { id: membership.id },
      data: { status: 'removed' },
    });

    await this.authService.revokeAllUserSessions(userId);
  }

  private async requireCity(cityId: string): Promise<void> {
    const city = await this.prisma.city.findUnique({
      where: { id: cityId },
    });
    if (!city || city.archivedAt) {
      throw new NotFoundException('cities.not_found');
    }
  }

  private toSettingsDto(settings: PrismaCitySettings): CitySettings {
    return citySettingsSchema.parse({
      cityId: settings.cityId,
      centerAddress: settings.centerAddress,
      centerLat: this.toNumber(settings.centerLat),
      centerLng: this.toNumber(settings.centerLng),
      defaultStartTime: this.formatTime(settings.defaultStartTime),
      defaultEndTime: this.formatTime(settings.defaultEndTime),
      confirmReminderAfterHours: settings.confirmReminderAfterHours,
      unpickedPushMinutesBeforeEnd: settings.unpickedPushMinutesBeforeEnd,
      missingFinalStatusWaitHours: settings.missingFinalStatusWaitHours,
      defaultLocale: settings.defaultLocale,
      defaultTheme: settings.defaultTheme,
      orgName: settings.orgName,
      logoUrl: settings.logoUrl,
      extra: this.toExtra(settings.extra),
    });
  }

  private toJoinLinkDto(invite: CityInvite): CityJoinLink {
    return cityJoinLinkSchema.parse({
      role: invite.role,
      token: invite.tokenHash,
      url: this.joinLinkUrl(invite.tokenHash),
      createdAt: invite.createdAt.toISOString(),
      usedCount: invite.usedCount,
    });
  }

  private toCoordinatorDto(membership: MembershipWithUser): CityCoordinator {
    return {
      membershipId: membership.id,
      userId: membership.userId,
      firstName: membership.user.firstName,
      lastName: membership.user.lastName,
      email: membership.user.email,
      phone: membership.user.phone,
      status: membership.status,
      createdAt: membership.createdAt.toISOString(),
      approvedAt: membership.approvedAt
        ? membership.approvedAt.toISOString()
        : null,
    };
  }

  private toNumber(
    value: Prisma.Decimal | number | undefined
  ): number | undefined {
    if (value === undefined) {
      return undefined;
    }
    return typeof value === 'number' ? value : value.toNumber();
  }

  private toExtra(value: Prisma.JsonValue): Record<string, unknown> {
    const parsed = citySettingsExtraSchema.safeParse(value);
    return parsed.success ? parsed.data : {};
  }

  private parseTime(value: string): Date {
    const normalized = this.normalizeTime(value);
    const [hours, minutes, seconds] = normalized
      .split(':')
      .map((part) => Number(part));
    return new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds));
  }

  private formatTime(value: Date): string {
    const hours = value.getUTCHours().toString().padStart(2, '0');
    const minutes = value.getUTCMinutes().toString().padStart(2, '0');
    const seconds = value.getUTCSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  private normalizeTime(value: string): string {
    const parts = value.split(':');
    const hours = (parts[0] ?? '00').padStart(2, '0');
    const minutes = (parts[1] ?? '00').padStart(2, '0');
    const seconds = (parts[2] ?? '00').padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  private timeToSeconds(value: string): number {
    const [hours, minutes, seconds] = value
      .split(':')
      .map((part) => Number(part));
    return hours * 3600 + minutes * 60 + seconds;
  }

  private generateJoinToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private joinLinkUrl(token: string): string {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${frontendUrl.replace(/\/$/, '')}/join/${token}`;
  }
}
