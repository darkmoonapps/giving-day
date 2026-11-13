import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AUDIT_LOG_PAGE_SIZE_DEFAULT,
  cityAuditLogsResponseSchema,
  listCityAuditLogsQuerySchema,
  type AuditDiff,
  type CityAuditLogsResponse,
  type ListCityAuditLogsQuery,
} from '@giving-day/shared';
import { Prisma } from '@prisma/client';
import {
  AbilityFactory,
  type UserWithMemberships,
} from '../abilities/ability.factory';
import { assertCanOnCity } from '../cities/city-access';
import { PrismaService } from '../prisma/prisma.service';

export interface RecordAuditLogInput {
  cityId: string;
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  diff: AuditDiff;
  at?: Date;
}

type AuditLogClient = {
  auditLog: {
    create: (args: {
      data: {
        cityId: string;
        actorId: string;
        action: string;
        entity: string;
        entityId: string;
        diff: Prisma.InputJsonValue;
        at: Date;
      };
    }) => Promise<unknown>;
  };
};

@Injectable()
export class AuditLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly abilityFactory: AbilityFactory
  ) {}

  async record(
    input: RecordAuditLogInput,
    db: AuditLogClient = this.prisma
  ): Promise<void> {
    await db.auditLog.create({
      data: {
        cityId: input.cityId,
        actorId: input.actorId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        diff: input.diff as Prisma.InputJsonValue,
        at: input.at ?? new Date(),
      },
    });
  }

  async listForCity(
    cityId: string,
    query: ListCityAuditLogsQuery,
    actor: UserWithMemberships
  ): Promise<CityAuditLogsResponse> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'read', 'AuditLog', cityId);

    const parsed = listCityAuditLogsQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException('audit_logs.invalid_query');
    }
    const page = parsed.data.page;
    const pageSize = parsed.data.pageSize ?? AUDIT_LOG_PAGE_SIZE_DEFAULT;
    const skip = (page - 1) * pageSize;

    const [total, rows] = await Promise.all([
      this.prisma.auditLog.count({ where: { cityId } }),
      this.prisma.auditLog.findMany({
        where: { cityId },
        orderBy: { at: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return cityAuditLogsResponseSchema.parse({
      entries: rows.map((row) => ({
        id: row.id,
        cityId: row.cityId,
        actorId: row.actorId,
        action: row.action,
        entity: row.entity,
        entityId: row.entityId,
        diff: this.toDiff(row.diff),
        at: row.at.toISOString(),
      })),
      page,
      pageSize,
      total,
    });
  }

  private toDiff(value: Prisma.JsonValue): AuditDiff {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    const diff: AuditDiff = {};
    for (const [key, entry] of Object.entries(value)) {
      if (
        entry === null ||
        typeof entry === 'string' ||
        typeof entry === 'number' ||
        typeof entry === 'boolean'
      ) {
        diff[key] = entry;
      }
    }
    return diff;
  }
}
