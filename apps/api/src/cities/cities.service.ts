import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  cityCoordinatorsResponseSchema,
  cityJoinLinkCreatedSchema,
  cityJoinLinksResponseSchema,
  cityMembershipRecordSchema,
  cityPendingMembershipsResponseSchema,
  citySettingsExtraSchema,
  citySettingsSchema,
  httpsUrlSchema,
  joinLinkPreviewSchema,
  redeemJoinLinkResponseSchema,
  type CityCoordinator,
  type CityCoordinatorsResponse,
  type CityJoinLinkCreated,
  type CityJoinLinksResponse,
  type CityMembershipRecord,
  type CityPendingMembershipsResponse,
  type CitySettings,
  type JoinLinkPreview,
  type RedeemJoinLinkResponse,
} from '@giving-day/shared';
import {
  CityRole,
  Prisma,
  type City,
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
import { generateJoinToken, hashJoinToken, joinLinkUrl } from './join-token';

type MembershipWithUser = CityMembership & {
  user: Pick<
    User,
    'id' | 'firstName' | 'lastName' | 'email' | 'phone' | 'archivedAt'
  >;
};

type JoinableCity = Pick<
  City,
  'id' | 'slug' | 'nameHe' | 'nameEn' | 'archivedAt' | 'isActive'
>;

const MEMBERSHIP_USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  archivedAt: true,
} as const;

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

    if (dto.logoUrl) {
      const parsedLogoUrl = httpsUrlSchema.safeParse(dto.logoUrl);
      if (!parsedLogoUrl.success) {
        throw new BadRequestException('cities.invalid_logo_url');
      }
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
    });
    const byRole = new Map(invites.map((invite) => [invite.role, invite]));

    return cityJoinLinksResponseSchema.parse({
      links: (['coordinator', 'volunteer'] as const).map((role) => {
        const invite = byRole.get(role);
        if (!invite) {
          return {
            role,
            active: false,
            createdAt: null,
            usedCount: 0,
          };
        }
        return {
          role,
          active: true,
          createdAt: invite.createdAt.toISOString(),
          usedCount: invite.usedCount,
        };
      }),
    });
  }

  async regenerateJoinLink(
    cityId: string,
    role: CityRole,
    actor: UserWithMemberships
  ): Promise<CityJoinLinkCreated> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'create', 'CityInvite', cityId);
    assertCanOnCity(ability, 'delete', 'CityInvite', cityId);
    await this.requireCity(cityId);

    const rawToken = generateJoinToken();
    const tokenHash = hashJoinToken(rawToken);
    const invite = await this.prisma.$transaction(async (tx) => {
      await tx.cityInvite.updateMany({
        where: { cityId, role, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      return tx.cityInvite.create({
        data: {
          cityId,
          role,
          tokenHash,
          createdById: actor.id,
        },
      });
    });

    return cityJoinLinkCreatedSchema.parse({
      role: invite.role,
      token: rawToken,
      url: joinLinkUrl(rawToken),
      createdAt: invite.createdAt.toISOString(),
      usedCount: invite.usedCount,
    });
  }

  async findActiveInviteByRawToken(
    rawToken: string
  ): Promise<CityInvite | null> {
    if (!rawToken) {
      return null;
    }

    const invite = await this.prisma.cityInvite.findUnique({
      where: { tokenHash: hashJoinToken(rawToken) },
    });

    return this.isInviteRedeemable(invite) ? invite : null;
  }

  async previewJoinLink(rawToken: string): Promise<JoinLinkPreview> {
    const token = rawToken.trim();
    if (!token || token.length > 128) {
      throw new NotFoundException('cities.invalid_join_token');
    }

    const invite = await this.findActiveInviteByRawToken(token);
    if (!invite) {
      throw new NotFoundException('cities.invalid_join_token');
    }

    const city = await this.prisma.city.findUnique({
      where: { id: invite.cityId },
      select: {
        id: true,
        slug: true,
        nameHe: true,
        nameEn: true,
        archivedAt: true,
        isActive: true,
      },
    });
    if (!this.isCityJoinable(city)) {
      throw new NotFoundException('cities.invalid_join_token');
    }

    return joinLinkPreviewSchema.parse({
      cityId: city.id,
      citySlug: city.slug,
      cityNameHe: city.nameHe,
      cityNameEn: city.nameEn,
      role: invite.role,
    });
  }

  async redeemJoinLink(
    rawToken: string,
    actor: UserWithMemberships
  ): Promise<RedeemJoinLinkResponse> {
    if (!actor.onboardedAt) {
      throw new ForbiddenException('auth.not_onboarded');
    }
    if (actor.archivedAt) {
      throw new ForbiddenException('auth.insufficient_permissions');
    }

    const token = rawToken.trim();
    if (!token) {
      throw new NotFoundException('cities.invalid_join_token');
    }

    try {
      const redeemed = await this.prisma.$transaction(async (tx) => {
        const invite = await tx.cityInvite.findUnique({
          where: { tokenHash: hashJoinToken(token) },
        });
        if (!this.isInviteRedeemable(invite)) {
          throw new NotFoundException('cities.invalid_join_token');
        }

        const city = await tx.city.findUnique({
          where: { id: invite.cityId },
          select: {
            id: true,
            slug: true,
            nameHe: true,
            nameEn: true,
            archivedAt: true,
            isActive: true,
          },
        });
        if (!this.isCityJoinable(city)) {
          throw new NotFoundException('cities.invalid_join_token');
        }

        const existing = await tx.cityMembership.findUnique({
          where: {
            cityId_userId: { cityId: invite.cityId, userId: actor.id },
          },
        });

        if (existing?.status === 'active') {
          return {
            result: 'already_active' as const,
            membership: existing,
            city,
          };
        }
        if (existing?.status === 'paused') {
          throw new ConflictException('cities.membership_paused');
        }
        if (existing?.status === 'pending') {
          const sameInvite =
            existing.role === invite.role && existing.inviteId === invite.id;
          const membership = sameInvite
            ? existing
            : await tx.cityMembership.update({
                where: { id: existing.id },
                data: { role: invite.role, inviteId: invite.id },
              });
          return { result: 'already_pending' as const, membership, city };
        }

        if (existing?.status === 'removed') {
          const membership = await tx.cityMembership.update({
            where: { id: existing.id },
            data: {
              cityId: invite.cityId,
              userId: actor.id,
              role: invite.role,
              status: 'pending' as const,
              inviteId: invite.id,
              approvedById: null,
              approvedAt: null,
            },
          });
          await tx.cityInvite.update({
            where: { id: invite.id },
            data: { usedCount: { increment: 1 } },
          });
          return { result: 'rejected' as const, membership, city };
        }

        const pendingData = {
          cityId: invite.cityId,
          userId: actor.id,
          role: invite.role,
          status: 'pending' as const,
          inviteId: invite.id,
          approvedById: null,
          approvedAt: null,
        };

        const membership = existing
          ? await tx.cityMembership.update({
              where: { id: existing.id },
              data: pendingData,
            })
          : await tx.cityMembership.create({
              data: pendingData,
            });

        await tx.cityInvite.update({
          where: { id: invite.id },
          data: { usedCount: { increment: 1 } },
        });

        return { result: 'pending' as const, membership, city };
      });

      return this.toRedeemedMembershipDto(
        redeemed.result,
        redeemed.membership,
        redeemed.city
      );
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return this.redeemJoinLinkAfterConflict(token, actor);
      }
      throw error;
    }
  }

  async listPendingMemberships(
    cityId: string,
    actor: UserWithMemberships
  ): Promise<CityPendingMembershipsResponse> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'read', 'CityMembership', cityId);
    await this.requireCity(cityId);

    const memberships = await this.prisma.cityMembership.findMany({
      where: {
        cityId,
        status: 'pending',
        user: { archivedAt: null },
      },
      include: {
        user: { select: MEMBERSHIP_USER_SELECT },
      },
      orderBy: { createdAt: 'asc' },
    });

    return cityPendingMembershipsResponseSchema.parse({
      memberships: memberships.map((membership) =>
        this.toMembershipRecordDto(membership)
      ),
    });
  }

  async approveMembership(
    cityId: string,
    membershipId: string,
    actor: UserWithMemberships
  ): Promise<CityMembershipRecord> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'approve', 'CityMembership', cityId);
    await this.requireCity(cityId);

    const membership = await this.requirePendingMembership(
      cityId,
      membershipId
    );

    const saved = await this.prisma.cityMembership.update({
      where: { id: membership.id },
      data: {
        status: 'active',
        approvedById: actor.id,
        approvedAt: new Date(),
      },
      include: {
        user: { select: MEMBERSHIP_USER_SELECT },
      },
    });

    // TODO(notifications): send membership_approved push to saved.userId
    // (Flow 10 / ADR 0020). Hook: NotificationsService.notifyUser with
    // templateKey 'membership_approved' and dedupeKey
    // `membership_approved:${saved.id}`. A leaked join link must never
    // skip this coordinator approval step.

    return this.toMembershipRecordDto(saved);
  }

  async rejectMembership(
    cityId: string,
    membershipId: string,
    actor: UserWithMemberships
  ): Promise<CityMembershipRecord> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'reject', 'CityMembership', cityId);
    await this.requireCity(cityId);

    const membership = await this.requirePendingMembership(
      cityId,
      membershipId
    );

    const saved = await this.prisma.cityMembership.update({
      where: { id: membership.id },
      data: {
        status: 'removed',
        approvedById: null,
        approvedAt: null,
      },
      include: {
        user: { select: MEMBERSHIP_USER_SELECT },
      },
    });

    return this.toMembershipRecordDto(saved);
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

    await this.prisma.$transaction(async (tx) => {
      const membership = await tx.cityMembership.findUnique({
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
        await tx.$queryRaw`
          SELECT id FROM "city_memberships"
          WHERE "cityId" = ${cityId}::uuid
            AND role = CAST(${'coordinator'} AS "CityRole")
            AND status = CAST(${'active'} AS "MembershipStatus")
          FOR UPDATE
        `;

        const activeCount = await tx.cityMembership.count({
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

      await tx.cityMembership.update({
        where: { id: membership.id },
        data: { status: 'removed' },
      });
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

  private async requirePendingMembership(
    cityId: string,
    membershipId: string
  ): Promise<MembershipWithUser> {
    const membership = await this.prisma.cityMembership.findFirst({
      where: { id: membershipId, cityId },
      include: {
        user: { select: MEMBERSHIP_USER_SELECT },
      },
    });

    if (!membership || membership.user.archivedAt) {
      throw new NotFoundException('cities.not_found');
    }
    if (membership.status !== 'pending') {
      throw new BadRequestException('cities.membership_not_pending');
    }

    return membership;
  }

  private isInviteRedeemable(invite: CityInvite | null): invite is CityInvite {
    if (!invite || invite.revokedAt) {
      return false;
    }
    if (invite.expiresAt && invite.expiresAt <= new Date()) {
      return false;
    }
    if (invite.maxUses != null && invite.usedCount >= invite.maxUses) {
      return false;
    }
    return true;
  }

  private isCityJoinable(city: JoinableCity | null): city is JoinableCity {
    return Boolean(city && !city.archivedAt && city.isActive);
  }

  private async redeemJoinLinkAfterConflict(
    token: string,
    actor: UserWithMemberships
  ): Promise<RedeemJoinLinkResponse> {
    const invite = await this.findActiveInviteByRawToken(token);
    if (!invite) {
      throw new NotFoundException('cities.invalid_join_token');
    }

    const city = await this.prisma.city.findUnique({
      where: { id: invite.cityId },
      select: {
        id: true,
        slug: true,
        nameHe: true,
        nameEn: true,
        archivedAt: true,
        isActive: true,
      },
    });
    if (!this.isCityJoinable(city)) {
      throw new NotFoundException('cities.invalid_join_token');
    }

    const existing = await this.prisma.cityMembership.findUnique({
      where: {
        cityId_userId: { cityId: invite.cityId, userId: actor.id },
      },
    });
    if (!existing) {
      throw new ConflictException('cities.already_member');
    }
    if (existing.status === 'active') {
      return this.toRedeemedMembershipDto('already_active', existing, city);
    }
    if (existing.status === 'pending') {
      return this.toRedeemedMembershipDto('already_pending', existing, city);
    }

    throw new ConflictException('cities.already_member');
  }

  private toRedeemedMembershipDto(
    result: RedeemJoinLinkResponse['result'],
    membership: CityMembership,
    city: JoinableCity
  ): RedeemJoinLinkResponse {
    return redeemJoinLinkResponseSchema.parse({
      result,
      membership: {
        membershipId: membership.id,
        cityId: membership.cityId,
        citySlug: city.slug,
        cityNameHe: city.nameHe,
        cityNameEn: city.nameEn,
        role: membership.role,
        status: membership.status,
      },
    });
  }

  private toMembershipRecordDto(
    membership: MembershipWithUser
  ): CityMembershipRecord {
    return cityMembershipRecordSchema.parse({
      membershipId: membership.id,
      userId: membership.userId,
      firstName: membership.user.firstName,
      lastName: membership.user.lastName,
      email: membership.user.email,
      phone: membership.user.phone,
      role: membership.role,
      status: membership.status,
      createdAt: membership.createdAt.toISOString(),
      approvedAt: membership.approvedAt
        ? membership.approvedAt.toISOString()
        : null,
    });
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
}
