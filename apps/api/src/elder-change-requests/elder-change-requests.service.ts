import { subject } from '@casl/ability';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  createElderChangeRequestSchema,
  elderChangeRequestChangesSchema,
  elderChangeRequestSchema,
  elderChangeRequestsResponseSchema,
  listElderChangeRequestsQuerySchema,
  rejectElderChangeRequestSchema,
  type ChangeRequestStatus,
  type CreateElderChangeRequest,
  type ElderChangeRequest as ElderChangeRequestDto,
  type ElderChangeRequestChanges,
  type ElderChangeRequestContactSnapshot,
  type ElderChangeRequestsResponse,
  type ElderContactInput,
  type ListElderChangeRequestsQuery,
  type ProposedElderChanges,
  type RejectElderChangeRequest,
} from '@giving-day/shared';
import {
  Prisma,
  type Elder,
  type ElderChangeRequest,
  type ElderContact,
  type User,
} from '@prisma/client';
import {
  AbilityFactory,
  type AppAbility,
  type AppSubjects,
  type UserWithMemberships,
} from '../abilities/ability.factory';
import { assertCanOnCity } from '../cities/city-access';
import { parseDateOnly, todayInTimeZone } from '../common/time-of-day';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateElderChangeRequestDto } from './dto/create-elder-change-request.dto';
import type { RejectElderChangeRequestDto } from './dto/reject-elder-change-request.dto';

const CONTACT_ORDER = [
  { isPrimary: 'desc' as const },
  { name: 'asc' as const },
];

const REQUEST_INCLUDE = {
  elder: {
    include: {
      contacts: {
        orderBy: CONTACT_ORDER,
      },
    },
  },
  requestedBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.ElderChangeRequestInclude;

type ElderWithContacts = Elder & { contacts: ElderContact[] };

type RequestWithRelations = ElderChangeRequest & {
  elder: ElderWithContacts;
  requestedBy: Pick<User, 'id' | 'firstName' | 'lastName'>;
};

type CityRow = {
  id: string;
  timezone: string;
};

@Injectable()
export class ElderChangeRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly abilityFactory: AbilityFactory
  ) {}

  async list(
    cityId: string,
    query: ListElderChangeRequestsQuery,
    actor: UserWithMemberships
  ): Promise<ElderChangeRequestsResponse> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'read', 'ElderChangeRequest', cityId);
    await this.requireCity(cityId);

    const parsedQuery = this.parseOrThrow(
      listElderChangeRequestsQuerySchema.safeParse(query),
      'change_requests.invalid'
    );
    const canReview = this.canReview(ability, cityId);
    const status = this.listStatusFilter(parsedQuery.status, canReview);

    const rows = await this.prisma.elderChangeRequest.findMany({
      where: {
        cityId,
        ...(canReview ? {} : { requestedById: actor.id }),
        ...(status ? { status } : {}),
      },
      include: REQUEST_INCLUDE,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });

    return elderChangeRequestsResponseSchema.parse({
      changeRequests: rows.map((row) => this.toDto(row)),
    });
  }

  async get(
    cityId: string,
    requestId: string,
    actor: UserWithMemberships
  ): Promise<ElderChangeRequestDto> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'read', 'ElderChangeRequest', cityId);
    await this.requireCity(cityId);
    return this.toDto(
      await this.requireRequest(cityId, requestId, actor, ability)
    );
  }

  async create(
    cityId: string,
    dto: CreateElderChangeRequestDto,
    actor: UserWithMemberships
  ): Promise<ElderChangeRequestDto> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'create', 'ElderChangeRequest', cityId);
    const city = await this.requireCity(cityId);
    const parsed = this.parseCreate(dto);

    const created = await this.prisma.$transaction(async (tx) => {
      const elder = await this.requireAssignableElder(
        tx,
        cityId,
        parsed.elderId
      );
      if (!actor.isSuperAdmin) {
        const assigned = await this.isVolunteerAssignedToElder(tx, {
          cityId,
          elderId: elder.id,
          volunteerId: actor.id,
          today: todayInTimeZone(city.timezone),
        });
        if (!assigned) {
          throw new NotFoundException('elders.not_found');
        }
      }

      const changes = this.buildStoredChanges(elder, parsed.changes);
      await tx.elderChangeRequest.updateMany({
        where: { cityId, elderId: elder.id, status: 'pending' },
        data: { status: 'superseded' },
      });

      return tx.elderChangeRequest.create({
        data: {
          cityId,
          elderId: elder.id,
          requestedById: actor.id,
          changes: this.toJsonValue(changes),
          reason: parsed.reason ?? null,
        },
        include: REQUEST_INCLUDE,
      });
    });

    return this.toDto(created);
  }

  async approve(
    cityId: string,
    requestId: string,
    actor: UserWithMemberships
  ): Promise<ElderChangeRequestDto> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'approve', 'ElderChangeRequest', cityId);
    await this.requireCity(cityId);

    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await this.requirePendingRequest(tx, cityId, requestId);
      const changes = this.parseStoredChanges(current.changes);
      const reviewedAt = new Date();

      const claimed = await tx.elderChangeRequest.updateMany({
        where: { id: requestId, cityId, status: 'pending' },
        data: {
          status: 'approved',
          reviewedById: actor.id,
          reviewedAt,
          reviewNote: null,
        },
      });
      if (claimed.count === 0) {
        throw new BadRequestException('change_requests.not_pending');
      }

      await tx.elder.update({
        where: { id: current.elderId },
        data: this.toElderUpdateData(changes),
      });

      if (changes.contacts) {
        this.assertAtMostOnePrimary(changes.contacts.to);
        await tx.elderContact.deleteMany({
          where: { elderId: current.elderId, cityId },
        });
        if (changes.contacts.to.length > 0) {
          await tx.elderContact.createMany({
            data: changes.contacts.to.map((contact) => ({
              elderId: current.elderId,
              cityId,
              name: contact.name,
              relation: contact.relation,
              phone: contact.phone,
              isPrimary: contact.isPrimary,
            })),
          });
        }
      }

      return tx.elderChangeRequest.findFirstOrThrow({
        where: { id: requestId, cityId },
        include: REQUEST_INCLUDE,
      });
    });

    return this.toDto(updated);
  }

  async reject(
    cityId: string,
    requestId: string,
    dto: RejectElderChangeRequestDto,
    actor: UserWithMemberships
  ): Promise<ElderChangeRequestDto> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'reject', 'ElderChangeRequest', cityId);
    await this.requireCity(cityId);
    const parsed = this.parseReject(dto);

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.requirePendingRequest(tx, cityId, requestId);
      const reviewedAt = new Date();
      const claimed = await tx.elderChangeRequest.updateMany({
        where: { id: requestId, cityId, status: 'pending' },
        data: {
          status: 'rejected',
          reviewedById: actor.id,
          reviewedAt,
          reviewNote: parsed.reviewNote ?? null,
        },
      });
      if (claimed.count === 0) {
        throw new BadRequestException('change_requests.not_pending');
      }

      return tx.elderChangeRequest.findFirstOrThrow({
        where: { id: requestId, cityId },
        include: REQUEST_INCLUDE,
      });
    });

    return this.toDto(updated);
  }

  private parseCreate(
    dto: CreateElderChangeRequestDto
  ): CreateElderChangeRequest {
    return this.parseOrThrow(
      createElderChangeRequestSchema.safeParse(dto),
      'change_requests.invalid'
    );
  }

  private parseReject(
    dto: RejectElderChangeRequestDto
  ): RejectElderChangeRequest {
    return this.parseOrThrow(
      rejectElderChangeRequestSchema.safeParse(dto),
      'change_requests.invalid'
    );
  }

  private parseStoredChanges(
    value: Prisma.JsonValue
  ): ElderChangeRequestChanges {
    return this.parseOrThrow(
      elderChangeRequestChangesSchema.safeParse(value),
      'change_requests.invalid_stored'
    );
  }

  private buildStoredChanges(
    elder: ElderWithContacts,
    proposed: ProposedElderChanges
  ): ElderChangeRequestChanges {
    const changes: ElderChangeRequestChanges = {};

    this.assignRequiredTextChange(
      changes,
      'street',
      elder.street,
      proposed.street
    );
    this.assignRequiredTextChange(
      changes,
      'houseNumber',
      elder.houseNumber,
      proposed.houseNumber
    );
    this.assignNullableTextChange(
      changes,
      'entrance',
      elder.entrance,
      proposed.entrance
    );
    this.assignNullableTextChange(
      changes,
      'floor',
      elder.floor,
      proposed.floor
    );
    this.assignNullableTextChange(
      changes,
      'apartment',
      elder.apartment,
      proposed.apartment
    );
    this.assignNullableTextChange(
      changes,
      'addressNotes',
      elder.addressNotes,
      proposed.addressNotes
    );
    this.assignNullableTextChange(
      changes,
      'notes',
      elder.notes,
      proposed.notes
    );

    if (proposed.contacts) {
      this.assertAtMostOnePrimary(proposed.contacts);
      if (!this.contactsEqual(elder.contacts, proposed.contacts)) {
        changes.contacts = {
          from: elder.contacts.map((contact) => ({
            id: contact.id,
            name: contact.name,
            relation: contact.relation,
            phone: contact.phone,
            isPrimary: contact.isPrimary,
          })),
          to: proposed.contacts,
        };
      }
    }

    const parsed = elderChangeRequestChangesSchema.safeParse(changes);
    if (!parsed.success) {
      throw new BadRequestException('change_requests.unchanged');
    }
    return parsed.data;
  }

  private assignRequiredTextChange(
    changes: ElderChangeRequestChanges,
    field: 'street' | 'houseNumber',
    from: string,
    to: string | undefined
  ): void {
    if (to === undefined || to === from) {
      return;
    }
    changes[field] = { from, to };
  }

  private assignNullableTextChange(
    changes: ElderChangeRequestChanges,
    field: 'entrance' | 'floor' | 'apartment' | 'addressNotes' | 'notes',
    from: string | null,
    to: string | null | undefined
  ): void {
    if (to === undefined || to === from) {
      return;
    }
    changes[field] = { from, to };
  }

  private toElderUpdateData(
    changes: ElderChangeRequestChanges
  ): Prisma.ElderUpdateInput {
    const data: Prisma.ElderUpdateInput = {};
    if (changes.street) {
      data.street = changes.street.to;
    }
    if (changes.houseNumber) {
      data.houseNumber = changes.houseNumber.to;
    }
    if (changes.entrance) {
      data.entrance = changes.entrance.to;
    }
    if (changes.floor) {
      data.floor = changes.floor.to;
    }
    if (changes.apartment) {
      data.apartment = changes.apartment.to;
    }
    if (changes.addressNotes) {
      data.addressNotes = changes.addressNotes.to;
    }
    if (changes.notes) {
      data.notes = changes.notes.to;
    }
    return data;
  }

  private contactsEqual(
    current: ElderContact[],
    proposed: ElderContactInput[]
  ): boolean {
    return this.serializeContacts(current) === this.serializeContacts(proposed);
  }

  private serializeContacts(
    contacts: Array<
      Pick<ElderChangeRequestContactSnapshot, 'name' | 'relation' | 'phone'> & {
        isPrimary?: boolean;
      }
    >
  ): string {
    return JSON.stringify(
      contacts
        .map((contact) => ({
          name: contact.name,
          relation: contact.relation,
          phone: contact.phone,
          isPrimary: contact.isPrimary ?? false,
        }))
        .sort((left, right) => {
          const byName = left.name.localeCompare(right.name);
          return byName !== 0 ? byName : left.phone.localeCompare(right.phone);
        })
    );
  }

  private assertAtMostOnePrimary(contacts: ElderContactInput[]): void {
    const primaryCount = contacts.filter((contact) => contact.isPrimary).length;
    if (primaryCount > 1) {
      throw new BadRequestException('elders.multiple_primary_contacts');
    }
  }

  private async isVolunteerAssignedToElder(
    tx: Prisma.TransactionClient,
    params: {
      cityId: string;
      elderId: string;
      volunteerId: string;
      today: string;
    }
  ): Promise<boolean> {
    const permanent = await tx.match.findFirst({
      where: {
        cityId: params.cityId,
        elderId: params.elderId,
        volunteerId: params.volunteerId,
        type: 'permanent',
        endsAt: null,
      },
      select: { id: true },
    });
    if (permanent !== null) {
      return true;
    }

    const today = parseDateOnly(params.today);
    const assignedDelivery = await tx.delivery.findFirst({
      where: {
        cityId: params.cityId,
        elderId: params.elderId,
        volunteerId: params.volunteerId,
        status: { notIn: ['unassigned', 'cancelled'] },
        day: {
          OR: [
            { status: 'in_progress' },
            { status: 'published', date: { gte: today } },
          ],
        },
      },
      select: { id: true },
    });
    return assignedDelivery !== null;
  }

  private async requireAssignableElder(
    tx: Prisma.TransactionClient,
    cityId: string,
    elderId: string
  ): Promise<ElderWithContacts> {
    const elder = await tx.elder.findFirst({
      where: { id: elderId, cityId, archivedAt: null },
      include: {
        contacts: { orderBy: CONTACT_ORDER },
      },
    });
    if (elder === null) {
      throw new NotFoundException('elders.not_found');
    }
    return elder;
  }

  private async requirePendingRequest(
    tx: Prisma.TransactionClient,
    cityId: string,
    requestId: string
  ): Promise<ElderChangeRequest> {
    const current = await tx.elderChangeRequest.findFirst({
      where: { id: requestId, cityId },
    });
    if (current === null) {
      throw new NotFoundException('change_requests.not_found');
    }
    if (current.status !== 'pending') {
      throw new BadRequestException('change_requests.not_pending');
    }
    return current;
  }

  private async requireRequest(
    cityId: string,
    requestId: string,
    actor: UserWithMemberships,
    ability: AppAbility
  ): Promise<RequestWithRelations> {
    const row = await this.prisma.elderChangeRequest.findFirst({
      where: {
        id: requestId,
        cityId,
        ...(this.canReview(ability, cityId) ? {} : { requestedById: actor.id }),
      },
      include: REQUEST_INCLUDE,
    });
    if (row === null) {
      throw new NotFoundException('change_requests.not_found');
    }
    return row;
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

  private canReview(ability: AppAbility, cityId: string): boolean {
    return ability.can(
      'approve',
      subject('ElderChangeRequest', { cityId }) as AppSubjects
    );
  }

  private listStatusFilter(
    status: ChangeRequestStatus | undefined,
    canReview: boolean
  ): ChangeRequestStatus | undefined {
    if (status !== undefined) {
      return status;
    }
    return canReview ? 'pending' : undefined;
  }

  private parseOrThrow<T>(
    result:
      | { success: true; data: T }
      | {
          success: false;
          error: { issues: ReadonlyArray<{ message: string }> };
        },
    fallback: string
  ): T {
    if (result.success) {
      return result.data;
    }

    const issue = result.error.issues[0];
    if (issue?.message === 'phone_e164') {
      throw new BadRequestException('elders.invalid_phone');
    }
    if (issue?.message === 'change_requests.empty') {
      throw new BadRequestException('change_requests.empty');
    }
    throw new BadRequestException(fallback);
  }

  private toJsonValue(
    changes: ElderChangeRequestChanges
  ): Prisma.InputJsonObject {
    return JSON.parse(JSON.stringify(changes)) as Prisma.InputJsonObject;
  }

  private toDto(row: RequestWithRelations): ElderChangeRequestDto {
    return elderChangeRequestSchema.parse({
      id: row.id,
      cityId: row.cityId,
      elderId: row.elderId,
      requestedById: row.requestedById,
      changes: this.parseStoredChanges(row.changes),
      reason: row.reason,
      status: row.status,
      reviewedById: row.reviewedById,
      reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
      reviewNote: row.reviewNote,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      elder: {
        id: row.elder.id,
        fullName: row.elder.fullName,
        street: row.elder.street,
        houseNumber: row.elder.houseNumber,
        entrance: row.elder.entrance,
        floor: row.elder.floor,
        apartment: row.elder.apartment,
        addressNotes: row.elder.addressNotes,
        notes: row.elder.notes,
        contacts: row.elder.contacts.map((contact) => ({
          id: contact.id,
          name: contact.name,
          relation: contact.relation,
          phone: contact.phone,
          isPrimary: contact.isPrimary,
        })),
      },
      requestedBy: {
        id: row.requestedBy.id,
        firstName: row.requestedBy.firstName,
        lastName: row.requestedBy.lastName,
      },
    });
  }
}
