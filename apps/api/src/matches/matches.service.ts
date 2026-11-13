import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  createOneTimeMatchSchema,
  createPermanentMatchSchema,
  endOneTimeMatchSchema,
  endPermanentMatchSchema,
  oneTimeMatchSchema,
  oneTimeMatchesResponseSchema,
  permanentMatchSchema,
  permanentMatchesResponseSchema,
  type CreateOneTimeMatch,
  type CreatePermanentMatch,
  type EndOneTimeMatch,
  type EndPermanentMatch,
  type OneTimeMatch,
  type OneTimeMatchesResponse,
  type PermanentMatch,
  type PermanentMatchesResponse,
} from '@giving-day/shared';
import {
  Prisma,
  type DeliveryStatus,
  type Elder,
  type Match,
  type User,
} from '@prisma/client';
import {
  AbilityFactory,
  type UserWithMemberships,
} from '../abilities/ability.factory';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { assertCanManageOnCity, assertCanOnCity } from '../cities/city-access';
import { confirmedAssignableWhere } from '../common/confirmed-assignable-volunteer';
import {
  formatDateOnly,
  parseDateOnly,
  todayInTimeZone,
} from '../common/time-of-day';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePermanentMatchDto } from './dto/create-match.dto';
import type { CreateOneTimeMatchDto } from './dto/create-one-time-match.dto';
import type { EndPermanentMatchDto } from './dto/end-match.dto';
import type { EndOneTimeMatchDto } from './dto/end-one-time-match.dto';

const ELDER_SUMMARY_SELECT = {
  id: true,
  fullName: true,
  status: true,
} satisfies Prisma.ElderSelect;

const VOLUNTEER_SUMMARY_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
} satisfies Prisma.UserSelect;

const MATCH_INCLUDE = {
  elder: { select: ELDER_SUMMARY_SELECT },
  volunteer: { select: VOLUNTEER_SUMMARY_SELECT },
} satisfies Prisma.MatchInclude;

type MatchWithSummaries = Match & {
  elder: Pick<Elder, 'id' | 'fullName' | 'status'>;
  volunteer: Pick<User, 'id' | 'firstName' | 'lastName'>;
};

type CityRow = {
  id: string;
  timezone: string;
};

const CURRENT_PERMANENT_MATCH_INDEX = 'matches_elderId_current_permanent';
const CURRENT_ONE_TIME_MATCH_INDEX = 'matches_elderId_dayId_one_time';
const REASSIGNABLE_DELIVERY_STATUSES: DeliveryStatus[] = [
  'unassigned',
  'assigned',
];
const EDITABLE_DAY_STATUSES = ['draft', 'published', 'in_progress'] as const;

type DayRow = {
  id: string;
  cityId: string;
  date: Date;
  status: (typeof EDITABLE_DAY_STATUSES)[number] | string;
};

function uniqueConstraintTargets(
  error: Prisma.PrismaClientKnownRequestError
): string[] {
  const target = error.meta?.target;
  if (typeof target === 'string') {
    return [target];
  }
  if (Array.isArray(target)) {
    return target.filter((value): value is string => typeof value === 'string');
  }
  return [];
}

@Injectable()
export class MatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly abilityFactory: AbilityFactory,
    private readonly auditLogs: AuditLogsService
  ) {}

  async list(
    cityId: string,
    actor: UserWithMemberships
  ): Promise<PermanentMatchesResponse> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanManageOnCity(ability, 'Match', cityId);
    await this.requireCity(cityId);

    const [matches, unmatchedElders, matchableVolunteers] = await Promise.all([
      this.prisma.match.findMany({
        where: { cityId, type: 'permanent', endsAt: null },
        include: MATCH_INCLUDE,
        orderBy: [{ elder: { fullName: 'asc' } }, { createdAt: 'asc' }],
      }),
      this.prisma.elder.findMany({
        where: {
          cityId,
          status: 'active',
          archivedAt: null,
          matches: { none: { type: 'permanent', endsAt: null } },
        },
        select: ELDER_SUMMARY_SELECT,
        orderBy: [{ fullName: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.user.findMany({
        where: this.approvedVolunteerWhere(cityId),
        select: VOLUNTEER_SUMMARY_SELECT,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
    ]);

    return permanentMatchesResponseSchema.parse({
      matches: matches.map((row) => this.toDto(row)),
      unmatchedElders,
      matchableVolunteers,
    });
  }

  async create(
    cityId: string,
    dto: CreatePermanentMatchDto,
    actor: UserWithMemberships
  ): Promise<PermanentMatch> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'create', 'Match', cityId);
    const city = await this.requireCity(cityId);
    const parsed = this.parseCreate(dto);
    const startsAt = parseDateOnly(
      parsed.startsAt ?? todayInTimeZone(city.timezone)
    );

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        await this.requireActiveElder(tx, cityId, parsed.elderId);
        await this.requireApprovedVolunteer(tx, cityId, parsed.volunteerId);
        await this.assertNoCurrentPermanentMatch(tx, parsed.elderId);

        return tx.match.create({
          data: {
            cityId,
            elderId: parsed.elderId,
            volunteerId: parsed.volunteerId,
            type: 'permanent',
            startsAt,
          },
          include: MATCH_INCLUDE,
        });
      });

      await this.auditLogs.record({
        cityId,
        actorId: actor.id,
        action: 'match.create',
        entity: 'match',
        entityId: created.id,
        diff: {
          type: 'permanent',
          elderId: created.elderId,
          volunteerId: created.volunteerId,
        },
      });

      return this.toDto(created);
    } catch (error: unknown) {
      if (this.isCurrentPermanentMatchConflict(error)) {
        throw new ConflictException('matches.elder_already_matched');
      }
      throw error;
    }
  }

  async end(
    cityId: string,
    matchId: string,
    dto: EndPermanentMatchDto,
    actor: UserWithMemberships
  ): Promise<PermanentMatch> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'update', 'Match', cityId);
    const city = await this.requireCity(cityId);
    const parsed = this.parseEnd(dto);

    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.match.findFirst({
        where: { id: matchId, cityId, type: 'permanent' },
      });
      if (current === null) {
        throw new NotFoundException('matches.not_found');
      }
      if (current.endsAt !== null) {
        throw new BadRequestException('matches.already_ended');
      }

      const today = todayInTimeZone(city.timezone);
      const endsAtValue = parsed.endsAt ?? today;
      if (endsAtValue > today) {
        throw new BadRequestException('matches.future_end_date');
      }

      const endsAt = parseDateOnly(endsAtValue);
      if (endsAt.getTime() < current.startsAt.getTime()) {
        throw new BadRequestException('matches.invalid_end_date');
      }

      const result = await tx.match.updateMany({
        where: { id: matchId, cityId, type: 'permanent', endsAt: null },
        data: {
          endsAt,
          endReason: parsed.endReason,
        },
      });
      if (result.count === 0) {
        throw new BadRequestException('matches.already_ended');
      }

      return tx.match.findFirstOrThrow({
        where: { id: matchId, cityId },
        include: MATCH_INCLUDE,
      });
    });

    await this.auditLogs.record({
      cityId,
      actorId: actor.id,
      action: 'match.end',
      entity: 'match',
      entityId: updated.id,
      diff: {
        type: 'permanent',
        elderId: updated.elderId,
        volunteerId: updated.volunteerId,
        endReason: updated.endReason,
      },
    });

    return this.toDto(updated);
  }

  async listOneTime(
    cityId: string,
    dayId: string,
    actor: UserWithMemberships
  ): Promise<OneTimeMatchesResponse> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanManageOnCity(ability, 'Match', cityId);
    await this.requireCity(cityId);
    await this.requireDay(cityId, dayId);

    const [matches, availableElders, confirmedRows] = await Promise.all([
      this.prisma.match.findMany({
        where: { cityId, dayId, type: 'one_time', endsAt: null },
        include: MATCH_INCLUDE,
        orderBy: [{ elder: { fullName: 'asc' } }, { createdAt: 'asc' }],
      }),
      this.prisma.elder.findMany({
        where: {
          cityId,
          status: 'active',
          archivedAt: null,
          matches: {
            none: { type: 'one_time', dayId, endsAt: null },
          },
        },
        select: ELDER_SUMMARY_SELECT,
        orderBy: [{ fullName: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.dayParticipation.findMany({
        where: confirmedAssignableWhere(cityId, dayId),
        select: {
          volunteer: { select: VOLUNTEER_SUMMARY_SELECT },
        },
        orderBy: [
          { volunteer: { lastName: 'asc' } },
          { volunteer: { firstName: 'asc' } },
        ],
      }),
    ]);

    return oneTimeMatchesResponseSchema.parse({
      matches: matches.map((row) => this.toOneTimeDto(row)),
      availableElders,
      matchableVolunteers: confirmedRows.map((row) => row.volunteer),
    });
  }

  async createOneTime(
    cityId: string,
    dayId: string,
    dto: CreateOneTimeMatchDto,
    actor: UserWithMemberships
  ): Promise<OneTimeMatch> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'create', 'Match', cityId);
    await this.requireCity(cityId);
    const day = await this.requireEditableDay(cityId, dayId);
    const parsed = this.parseCreateOneTime(dto);
    const startsAt = day.date;
    const assignedAt = new Date();

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        await this.requireActiveElder(tx, cityId, parsed.elderId);
        await this.requireConfirmedVolunteer(
          tx,
          cityId,
          dayId,
          parsed.volunteerId
        );
        await this.assertNoCurrentOneTimeMatch(tx, parsed.elderId, dayId);

        const match = await tx.match.create({
          data: {
            cityId,
            elderId: parsed.elderId,
            volunteerId: parsed.volunteerId,
            type: 'one_time',
            dayId,
            startsAt,
          },
          include: MATCH_INCLUDE,
        });

        await this.applyOneTimeMatchToDelivery(tx, {
          cityId,
          dayId,
          elderId: parsed.elderId,
          volunteerId: parsed.volunteerId,
          matchId: match.id,
          actorId: actor.id,
          assignedAt,
        });

        return match;
      });

      await this.auditLogs.record({
        cityId,
        actorId: actor.id,
        action: 'match.create',
        entity: 'match',
        entityId: created.id,
        diff: {
          type: 'one_time',
          dayId,
          elderId: created.elderId,
          volunteerId: created.volunteerId,
        },
      });

      return this.toOneTimeDto(created);
    } catch (error: unknown) {
      if (this.isCurrentOneTimeMatchConflict(error)) {
        throw new ConflictException('matches.elder_already_matched_for_day');
      }
      throw error;
    }
  }

  async endOneTime(
    cityId: string,
    dayId: string,
    matchId: string,
    dto: EndOneTimeMatchDto,
    actor: UserWithMemberships
  ): Promise<OneTimeMatch> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'update', 'Match', cityId);
    await this.requireCity(cityId);
    await this.requireEditableDay(cityId, dayId);
    const parsed = this.parseEndOneTime(dto);
    const unassignedAt = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.match.findFirst({
        where: { id: matchId, cityId, dayId, type: 'one_time' },
      });
      if (current === null) {
        throw new NotFoundException('matches.not_found');
      }
      if (current.endsAt !== null) {
        throw new BadRequestException('matches.already_ended');
      }

      const result = await tx.match.updateMany({
        where: {
          id: matchId,
          cityId,
          dayId,
          type: 'one_time',
          endsAt: null,
        },
        data: {
          endsAt: current.startsAt,
          endReason: parsed.endReason,
        },
      });
      if (result.count === 0) {
        throw new BadRequestException('matches.already_ended');
      }

      await this.clearOneTimeMatchFromDelivery(tx, {
        cityId,
        dayId,
        matchId,
        actorId: actor.id,
        at: unassignedAt,
      });

      return tx.match.findFirstOrThrow({
        where: { id: matchId, cityId, dayId },
        include: MATCH_INCLUDE,
      });
    });

    await this.auditLogs.record({
      cityId,
      actorId: actor.id,
      action: 'match.end',
      entity: 'match',
      entityId: updated.id,
      diff: {
        type: 'one_time',
        dayId,
        elderId: updated.elderId,
        volunteerId: updated.volunteerId,
        endReason: updated.endReason,
      },
    });

    return this.toOneTimeDto(updated);
  }

  private parseCreate(dto: CreatePermanentMatchDto): CreatePermanentMatch {
    const parsed = createPermanentMatchSchema.safeParse(dto);
    if (!parsed.success) {
      throw new BadRequestException('matches.invalid');
    }
    return parsed.data;
  }

  private parseEnd(dto: EndPermanentMatchDto): EndPermanentMatch {
    const parsed = endPermanentMatchSchema.safeParse(dto);
    if (!parsed.success) {
      throw new BadRequestException('matches.invalid');
    }
    return parsed.data;
  }

  private parseCreateOneTime(dto: CreateOneTimeMatchDto): CreateOneTimeMatch {
    const parsed = createOneTimeMatchSchema.safeParse(dto);
    if (!parsed.success) {
      throw new BadRequestException('matches.invalid');
    }
    return parsed.data;
  }

  private parseEndOneTime(dto: EndOneTimeMatchDto): EndOneTimeMatch {
    const parsed = endOneTimeMatchSchema.safeParse(dto);
    if (!parsed.success) {
      throw new BadRequestException('matches.invalid');
    }
    return parsed.data;
  }

  private async requireCity(cityId: string): Promise<CityRow> {
    const city = await this.prisma.city.findUnique({
      where: { id: cityId },
      select: { id: true, timezone: true, archivedAt: true },
    });
    if (!city || city.archivedAt) {
      throw new NotFoundException('cities.not_found');
    }
    return { id: city.id, timezone: city.timezone };
  }

  private async requireDay(cityId: string, dayId: string): Promise<DayRow> {
    const day = await this.prisma.distributionDay.findFirst({
      where: { id: dayId, cityId },
      select: { id: true, cityId: true, date: true, status: true },
    });
    if (day === null) {
      throw new NotFoundException('distribution_days.not_found');
    }
    return day;
  }

  private async requireEditableDay(
    cityId: string,
    dayId: string
  ): Promise<DayRow> {
    const day = await this.requireDay(cityId, dayId);
    if (
      !EDITABLE_DAY_STATUSES.includes(
        day.status as (typeof EDITABLE_DAY_STATUSES)[number]
      )
    ) {
      throw new BadRequestException('matches.day_not_editable');
    }
    return day;
  }

  private async requireActiveElder(
    tx: Prisma.TransactionClient,
    cityId: string,
    elderId: string
  ): Promise<void> {
    const elder = await tx.elder.findFirst({
      where: { id: elderId, cityId, archivedAt: null },
      select: { id: true, status: true },
    });
    if (elder === null) {
      throw new NotFoundException('elders.not_found');
    }
    if (elder.status !== 'active') {
      throw new BadRequestException('matches.elder_not_active');
    }
  }

  private async requireApprovedVolunteer(
    tx: Prisma.TransactionClient,
    cityId: string,
    volunteerId: string
  ): Promise<void> {
    const volunteer = await tx.user.findFirst({
      where: {
        id: volunteerId,
        ...this.approvedVolunteerWhere(cityId),
      },
      select: { id: true },
    });
    if (volunteer === null) {
      throw new BadRequestException('matches.invalid_volunteer');
    }
  }

  private async requireConfirmedVolunteer(
    tx: Prisma.TransactionClient,
    cityId: string,
    dayId: string,
    volunteerId: string
  ): Promise<void> {
    const participation = await tx.dayParticipation.findFirst({
      where: confirmedAssignableWhere(cityId, dayId, volunteerId),
      select: { volunteerId: true },
    });
    if (participation === null) {
      throw new BadRequestException('matches.volunteer_not_confirmed');
    }
  }

  private async assertNoCurrentPermanentMatch(
    tx: Prisma.TransactionClient,
    elderId: string
  ): Promise<void> {
    const existing = await tx.match.findFirst({
      where: { elderId, type: 'permanent', endsAt: null },
      select: { id: true },
    });
    if (existing !== null) {
      throw new ConflictException('matches.elder_already_matched');
    }
  }

  private async assertNoCurrentOneTimeMatch(
    tx: Prisma.TransactionClient,
    elderId: string,
    dayId: string
  ): Promise<void> {
    const existing = await tx.match.findFirst({
      where: { elderId, dayId, type: 'one_time', endsAt: null },
      select: { id: true },
    });
    if (existing !== null) {
      throw new ConflictException('matches.elder_already_matched_for_day');
    }
  }

  private approvedVolunteerWhere(cityId: string): Prisma.UserWhereInput {
    return {
      archivedAt: null,
      memberships: {
        some: {
          cityId,
          role: 'volunteer',
          status: 'active',
        },
      },
    };
  }

  private isCurrentPermanentMatchConflict(error: unknown): boolean {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== 'P2002'
    ) {
      return false;
    }

    return uniqueConstraintTargets(error).includes(
      CURRENT_PERMANENT_MATCH_INDEX
    );
  }

  private isCurrentOneTimeMatchConflict(error: unknown): boolean {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== 'P2002'
    ) {
      return false;
    }

    return uniqueConstraintTargets(error).includes(
      CURRENT_ONE_TIME_MATCH_INDEX
    );
  }

  private async applyOneTimeMatchToDelivery(
    tx: Prisma.TransactionClient,
    params: {
      cityId: string;
      dayId: string;
      elderId: string;
      volunteerId: string;
      matchId: string;
      actorId: string;
      assignedAt: Date;
    }
  ): Promise<void> {
    const delivery = await tx.delivery.findFirst({
      where: {
        cityId: params.cityId,
        dayId: params.dayId,
        elderId: params.elderId,
        status: { in: REASSIGNABLE_DELIVERY_STATUSES },
      },
    });
    if (delivery === null) {
      return;
    }

    const result = await tx.delivery.updateMany({
      where: {
        id: delivery.id,
        cityId: params.cityId,
        dayId: params.dayId,
        status: { in: REASSIGNABLE_DELIVERY_STATUSES },
      },
      data: {
        volunteerId: params.volunteerId,
        matchId: params.matchId,
        status: 'assigned',
        assignedAt: params.assignedAt,
      },
    });
    if (result.count === 0) {
      return;
    }

    await tx.deliveryEvent.create({
      data: {
        deliveryId: delivery.id,
        fromStatus: delivery.status,
        toStatus: 'assigned',
        fromVolunteerId: delivery.volunteerId,
        toVolunteerId: params.volunteerId,
        actorId: params.actorId,
        at: params.assignedAt,
      },
    });
  }

  private async clearOneTimeMatchFromDelivery(
    tx: Prisma.TransactionClient,
    params: {
      cityId: string;
      dayId: string;
      matchId: string;
      actorId: string;
      at: Date;
    }
  ): Promise<void> {
    const delivery = await tx.delivery.findFirst({
      where: {
        cityId: params.cityId,
        dayId: params.dayId,
        matchId: params.matchId,
        status: { in: REASSIGNABLE_DELIVERY_STATUSES },
      },
    });
    if (delivery === null) {
      return;
    }

    const result = await tx.delivery.updateMany({
      where: {
        id: delivery.id,
        cityId: params.cityId,
        dayId: params.dayId,
        matchId: params.matchId,
        status: { in: REASSIGNABLE_DELIVERY_STATUSES },
      },
      data: {
        volunteerId: null,
        matchId: null,
        status: 'unassigned',
        assignedAt: null,
      },
    });
    if (result.count === 0) {
      return;
    }

    await tx.deliveryEvent.create({
      data: {
        deliveryId: delivery.id,
        fromStatus: delivery.status,
        toStatus: 'unassigned',
        fromVolunteerId: delivery.volunteerId,
        toVolunteerId: null,
        actorId: params.actorId,
        at: params.at,
      },
    });
  }

  private toDto(row: MatchWithSummaries): PermanentMatch {
    return permanentMatchSchema.parse({
      id: row.id,
      cityId: row.cityId,
      elderId: row.elderId,
      volunteerId: row.volunteerId,
      type: 'permanent',
      startsAt: formatDateOnly(row.startsAt),
      endsAt: row.endsAt ? formatDateOnly(row.endsAt) : null,
      endReason: row.endReason,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      elder: row.elder,
      volunteer: row.volunteer,
    });
  }

  private toOneTimeDto(row: MatchWithSummaries): OneTimeMatch {
    if (row.dayId === null) {
      throw new BadRequestException('matches.invalid');
    }

    return oneTimeMatchSchema.parse({
      id: row.id,
      cityId: row.cityId,
      elderId: row.elderId,
      volunteerId: row.volunteerId,
      type: 'one_time',
      dayId: row.dayId,
      startsAt: formatDateOnly(row.startsAt),
      endsAt: row.endsAt ? formatDateOnly(row.endsAt) : null,
      endReason: row.endReason,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      elder: row.elder,
      volunteer: row.volunteer,
    });
  }
}
