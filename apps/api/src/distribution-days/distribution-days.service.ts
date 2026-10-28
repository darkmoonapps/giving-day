import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  distributionDayCoordinatorSchema,
  distributionDaysResponseSchema,
  distributionDayVolunteerSchema,
  openDayStatusSchema,
  type DistributionDay as DistributionDayDto,
  type DistributionDaysResponse,
} from '@giving-day/shared';
import { Prisma } from '@prisma/client';
import type { DistributionDay as PrismaDistributionDay } from '@prisma/client';
import {
  AbilityFactory,
  type UserWithMemberships,
} from '../abilities/ability.factory';
import { assertCanOnCity } from '../cities/city-access';
import {
  formatDateOnly,
  formatTime,
  normalizeTime,
  parseDateOnly,
  parseTime,
  timeToSeconds,
} from '../common/time-of-day';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import type { OpenDistributionDayDto } from './dto/open-distribution-day.dto';

const OPEN_STATUSES = openDayStatusSchema.options;
const CLOSEABLE_STATUSES = new Set(['published', 'in_progress']);

@Injectable()
export class DistributionDaysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly abilityFactory: AbilityFactory,
    private readonly notificationsService: NotificationsService
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
      created = await this.prisma.distributionDay.create({
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

    return distributionDaysResponseSchema.parse({
      days: days.map((day) => this.toDto(day, includeInternal)),
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

    return this.toDto(day, includeInternal);
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

  private toDto(
    day: PrismaDistributionDay,
    includeInternal: boolean
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

    return distributionDayVolunteerSchema.parse(base);
  }
}
