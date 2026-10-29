import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  dayParticipationsResponseSchema,
  distributionDayCoordinatorSchema,
  distributionDaysResponseSchema,
  distributionDayVolunteerSchema,
  openDayStatusSchema,
  ownDayParticipationSchema,
  respondToDistributionDaySchema,
  type DayParticipationsResponse,
  type DistributionDay as DistributionDayDto,
  type DistributionDaysResponse,
  type OwnDayParticipation,
  type VolunteerResponseStatus,
} from '@giving-day/shared';
import { Prisma } from '@prisma/client';
import type {
  DayParticipation as PrismaDayParticipation,
  DistributionDay as PrismaDistributionDay,
  ParticipationStatus,
} from '@prisma/client';
import {
  AbilityFactory,
  type UserWithMemberships,
} from '../abilities/ability.factory';
import {
  assertActiveVolunteerInCity,
  assertCanOnCity,
} from '../cities/city-access';
import {
  formatDateOnly,
  formatTime,
  normalizeTime,
  parseDateOnly,
  parseTime,
  timeToSeconds,
} from '../common/time-of-day';
import { DeliveriesService } from '../deliveries/deliveries.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import type { OpenDistributionDayDto } from './dto/open-distribution-day.dto';
import type { RespondToDistributionDayDto } from './dto/respond-to-distribution-day.dto';

const OPEN_STATUSES = openDayStatusSchema.options;
const CLOSEABLE_STATUSES = new Set(['published', 'in_progress']);

@Injectable()
export class DistributionDaysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly abilityFactory: AbilityFactory,
    private readonly notificationsService: NotificationsService,
    private readonly deliveriesService: DeliveriesService
  ) {}

  async open(
    cityId: string,
    dto: OpenDistributionDayDto,
    actor: UserWithMemberships
  ): Promise<DistributionDayDto> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'create', 'DistributionDay', cityId);
    await this.requireCity(cityId);

    const settings = await this.prisma.citySettings.findUnique({
      where: { cityId },
    });
    if (!settings) {
      throw new BadRequestException('distribution_days.settings_required');
    }

    const startTime = normalizeTime(
      dto.startTime ?? formatTime(settings.defaultStartTime)
    );
    const endTime = normalizeTime(
      dto.endTime ?? formatTime(settings.defaultEndTime)
    );

    if (timeToSeconds(startTime) >= timeToSeconds(endTime)) {
      throw new BadRequestException('distribution_days.invalid_time_range');
    }

    const date = parseDateOnly(dto.date);
    const publishedAt = new Date();

    let created: PrismaDistributionDay;
    try {
      created = await this.prisma.$transaction(async (tx) => {
        const day = await tx.distributionDay.create({
          data: {
            cityId,
            date,
            startTime: parseTime(startTime),
            endTime: parseTime(endTime),
            notesForVolunteers: dto.notesForVolunteers ?? null,
            internalNotes: dto.internalNotes ?? null,
            addOns: dto.addOns ?? [],
            status: 'published',
            publishedAt,
            createdById: actor.id,
          },
        });

        await this.deliveriesService.prefillFromPermanentMatches(tx, {
          cityId,
          dayId: day.id,
          actorId: actor.id,
        });

        return day;
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('distribution_days.duplicate_date');
      }
      throw error;
    }

    await this.notificationsService.announceDistributionDay(created);
    return this.toDto(created, true);
  }

  async list(
    cityId: string,
    actor: UserWithMemberships
  ): Promise<DistributionDaysResponse> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'read', 'DistributionDay', cityId);
    await this.requireCity(cityId);

    const includeInternal = this.canSeeInternal(actor, cityId);
    const days = await this.prisma.distributionDay.findMany({
      where: {
        cityId,
        ...(includeInternal ? {} : { status: { in: [...OPEN_STATUSES] } }),
      },
      orderBy: { date: 'desc' },
    });

    const myParticipationByDayId = includeInternal
      ? new Map<string, OwnDayParticipation>()
      : await this.loadOwnParticipations(
          cityId,
          actor.id,
          days.map((day) => day.id)
        );

    return distributionDaysResponseSchema.parse({
      days: days.map((day) =>
        this.toDto(
          day,
          includeInternal,
          myParticipationByDayId.get(day.id) ?? null
        )
      ),
    });
  }

  async get(
    cityId: string,
    dayId: string,
    actor: UserWithMemberships
  ): Promise<DistributionDayDto> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'read', 'DistributionDay', cityId);
    await this.requireCity(cityId);

    const day = await this.requireDay(cityId, dayId);
    const includeInternal = this.canSeeInternal(actor, cityId);

    if (!includeInternal && !this.isOpen(day.status)) {
      throw new NotFoundException('distribution_days.not_found');
    }

    return this.toDto(
      day,
      includeInternal,
      includeInternal
        ? null
        : await this.loadOwnParticipation(cityId, day.id, actor.id)
    );
  }

  async respond(
    cityId: string,
    dayId: string,
    dto: RespondToDistributionDayDto,
    actor: UserWithMemberships
  ): Promise<OwnDayParticipation> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'create', 'DayParticipation', cityId);
    assertActiveVolunteerInCity(actor, cityId);
    await this.requireCity(cityId);

    const day = await this.requireDay(cityId, dayId);
    if (!this.isOpen(day.status)) {
      throw new BadRequestException('distribution_days.not_open');
    }

    const payload = respondToDistributionDaySchema.parse(dto);
    const respondedAt = new Date();
    const cancelReason =
      payload.status === 'declined' ? payload.cancelReason : null;

    const saved = await this.prisma.$transaction(async (tx) => {
      const participation = await tx.dayParticipation.upsert({
        where: {
          dayId_volunteerId: {
            dayId: day.id,
            volunteerId: actor.id,
          },
        },
        create: {
          cityId,
          dayId: day.id,
          volunteerId: actor.id,
          status: payload.status,
          respondedAt,
          cancelReason,
        },
        update: {
          status: payload.status,
          respondedAt,
          cancelReason,
        },
      });

      if (payload.status === 'declined') {
        await tx.delivery.updateMany({
          where: {
            cityId,
            dayId: day.id,
            volunteerId: actor.id,
            status: { in: ['assigned', 'picked'] },
          },
          data: {
            volunteerId: null,
            status: 'unassigned',
            assignedAt: null,
          },
        });
      }

      return participation;
    });

    return this.toOwnParticipation(saved);
  }

  async listParticipations(
    cityId: string,
    dayId: string,
    actor: UserWithMemberships
  ): Promise<DayParticipationsResponse> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'read', 'DayParticipation', cityId);
    await this.requireCity(cityId);
    await this.requireDay(cityId, dayId);

    const [volunteers, participations] = await Promise.all([
      this.prisma.cityMembership.findMany({
        where: {
          cityId,
          role: 'volunteer',
          status: 'active',
          user: { archivedAt: null },
        },
        select: {
          userId: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: [
          { user: { lastName: 'asc' } },
          { user: { firstName: 'asc' } },
        ],
      }),
      this.prisma.dayParticipation.findMany({
        where: { cityId, dayId },
      }),
    ]);

    const participationByVolunteerId = new Map(
      participations.map((participation) => [
        participation.volunteerId,
        participation,
      ])
    );

    return dayParticipationsResponseSchema.parse({
      dayId,
      cityId,
      responses: volunteers.map((membership) => {
        const participation = participationByVolunteerId.get(membership.userId);
        const responseStatus = this.toCoordinatorResponseStatus(
          participation?.status
        );

        return {
          volunteerId: membership.userId,
          firstName: membership.user.firstName,
          lastName: membership.user.lastName,
          responseStatus,
          cancelReason:
            responseStatus === 'declined'
              ? (participation?.cancelReason ?? null)
              : null,
          respondedAt: participation?.respondedAt
            ? participation.respondedAt.toISOString()
            : null,
        };
      }),
    });
  }

  async close(
    cityId: string,
    dayId: string,
    actor: UserWithMemberships
  ): Promise<DistributionDayDto> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'close', 'DistributionDay', cityId);
    await this.requireCity(cityId);

    const day = await this.requireDay(cityId, dayId);

    if (day.status === 'closed') {
      throw new ConflictException('distribution_days.already_closed');
    }

    if (!CLOSEABLE_STATUSES.has(day.status)) {
      throw new BadRequestException('distribution_days.cannot_close');
    }

    const closed = await this.prisma.distributionDay.update({
      where: { id: day.id },
      data: {
        status: 'closed',
        closedAt: new Date(),
      },
    });

    return this.toDto(closed, true);
  }

  private async requireCity(cityId: string): Promise<void> {
    const city = await this.prisma.city.findUnique({
      where: { id: cityId },
    });
    if (!city || city.archivedAt) {
      throw new NotFoundException('cities.not_found');
    }
  }

  private async requireDay(
    cityId: string,
    dayId: string
  ): Promise<PrismaDistributionDay> {
    const day = await this.prisma.distributionDay.findFirst({
      where: { id: dayId, cityId },
    });
    if (!day) {
      throw new NotFoundException('distribution_days.not_found');
    }
    return day;
  }

  private canSeeInternal(actor: UserWithMemberships, cityId: string): boolean {
    if (actor.isSuperAdmin) {
      return true;
    }

    return actor.memberships.some(
      (membership) =>
        membership.cityId === cityId &&
        membership.role === 'coordinator' &&
        membership.status === 'active'
    );
  }

  private isOpen(status: PrismaDistributionDay['status']): boolean {
    return status === 'published' || status === 'in_progress';
  }

  private async loadOwnParticipation(
    cityId: string,
    dayId: string,
    volunteerId: string
  ): Promise<OwnDayParticipation | null> {
    const row = await this.prisma.dayParticipation.findUnique({
      where: {
        dayId_volunteerId: { dayId, volunteerId },
      },
    });

    if (!row || row.cityId !== cityId) {
      return null;
    }

    return this.toOwnParticipationOrNull(row);
  }

  private async loadOwnParticipations(
    cityId: string,
    volunteerId: string,
    dayIds: string[]
  ): Promise<Map<string, OwnDayParticipation>> {
    const byDayId = new Map<string, OwnDayParticipation>();
    if (dayIds.length === 0) {
      return byDayId;
    }

    const rows = await this.prisma.dayParticipation.findMany({
      where: {
        cityId,
        volunteerId,
        dayId: { in: dayIds },
      },
    });

    for (const row of rows) {
      const own = this.toOwnParticipationOrNull(row);
      if (own !== null) {
        byDayId.set(row.dayId, own);
      }
    }

    return byDayId;
  }

  private toCoordinatorResponseStatus(
    status: ParticipationStatus | undefined
  ): VolunteerResponseStatus {
    if (status === 'confirmed') {
      return 'confirmed';
    }
    if (status === 'declined' || status === 'cancelled') {
      return 'declined';
    }
    return 'no_response';
  }

  private toOwnParticipation(row: PrismaDayParticipation): OwnDayParticipation {
    const own = this.toOwnParticipationOrNull(row);
    if (own === null) {
      throw new BadRequestException('distribution_days.invalid_participation');
    }
    return own;
  }

  private toOwnParticipationOrNull(
    row: PrismaDayParticipation
  ): OwnDayParticipation | null {
    if (row.status !== 'confirmed' && row.status !== 'declined') {
      return null;
    }

    return ownDayParticipationSchema.parse({
      id: row.id,
      cityId: row.cityId,
      dayId: row.dayId,
      volunteerId: row.volunteerId,
      status: row.status,
      respondedAt: row.respondedAt ? row.respondedAt.toISOString() : null,
      cancelReason: row.cancelReason,
    });
  }

  private toDto(
    day: PrismaDistributionDay,
    includeInternal: boolean,
    myParticipation: OwnDayParticipation | null = null
  ): DistributionDayDto {
    const base = {
      id: day.id,
      cityId: day.cityId,
      date: formatDateOnly(day.date),
      startTime: formatTime(day.startTime),
      endTime: formatTime(day.endTime),
      notesForVolunteers: day.notesForVolunteers,
      addOns: day.addOns,
      status: day.status,
      publishedAt: day.publishedAt ? day.publishedAt.toISOString() : null,
      closedAt: day.closedAt ? day.closedAt.toISOString() : null,
    };

    if (includeInternal) {
      return distributionDayCoordinatorSchema.parse({
        ...base,
        internalNotes: day.internalNotes,
        createdById: day.createdById,
      });
    }

    return distributionDayVolunteerSchema.parse({
      ...base,
      myParticipation,
    });
  }
}
