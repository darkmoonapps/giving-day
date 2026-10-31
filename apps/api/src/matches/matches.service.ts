import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  createPermanentMatchSchema,
  endPermanentMatchSchema,
  permanentMatchSchema,
  permanentMatchesResponseSchema,
  type CreatePermanentMatch,
  type EndPermanentMatch,
  type PermanentMatch,
  type PermanentMatchesResponse,
} from '@giving-day/shared';
import { Prisma, type Elder, type Match, type User } from '@prisma/client';
import {
  AbilityFactory,
  type UserWithMemberships,
} from '../abilities/ability.factory';
import { assertCanManageOnCity, assertCanOnCity } from '../cities/city-access';
import {
  formatDateOnly,
  parseDateOnly,
  todayInTimeZone,
} from '../common/time-of-day';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePermanentMatchDto } from './dto/create-match.dto';
import type { EndPermanentMatchDto } from './dto/end-match.dto';

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

@Injectable()
export class MatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly abilityFactory: AbilityFactory
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

      const endsAt = parseDateOnly(
        parsed.endsAt ?? todayInTimeZone(city.timezone)
      );
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

    return this.toDto(updated);
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
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
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
}
