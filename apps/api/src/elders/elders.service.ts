import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  createElderSchema,
  elderSchema,
  eldersResponseSchema,
  listEldersQuerySchema,
  updateElderSchema,
  type Elder as ElderDto,
  type ElderContactInput,
  type EldersResponse,
  type ListEldersQuery,
  type UpdateElder,
} from '@giving-day/shared';
import { Prisma, type Elder, type ElderContact } from '@prisma/client';
import {
  AbilityFactory,
  type UserWithMemberships,
} from '../abilities/ability.factory';
import { assertCanManageOnCity, assertCanOnCity } from '../cities/city-access';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateElderDto } from './dto/create-elder.dto';
import type { UpdateElderDto } from './dto/update-elder.dto';

const CONTACT_INCLUDE = {
  contacts: {
    orderBy: [{ isPrimary: 'desc' as const }, { name: 'asc' as const }],
  },
} satisfies Prisma.ElderInclude;

type ElderWithContacts = Elder & { contacts: ElderContact[] };

@Injectable()
export class EldersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly abilityFactory: AbilityFactory
  ) {}

  async list(
    cityId: string,
    query: ListEldersQuery,
    actor: UserWithMemberships
  ): Promise<EldersResponse> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanManageOnCity(ability, 'Elder', cityId);
    await this.requireCity(cityId);

    const parsedQuery = this.parseOrThrow(
      listEldersQuerySchema.safeParse(query),
      'elders.invalid'
    );

    const elders = await this.prisma.elder.findMany({
      where: {
        cityId,
        ...(parsedQuery.status ? { status: parsedQuery.status } : {}),
        ...(parsedQuery.includeArchived ? {} : { archivedAt: null }),
      },
      include: CONTACT_INCLUDE,
      orderBy: [{ fullName: 'asc' }, { createdAt: 'asc' }],
    });

    return eldersResponseSchema.parse({
      elders: elders.map((elder) => this.toDto(elder)),
    });
  }

  async get(
    cityId: string,
    elderId: string,
    actor: UserWithMemberships
  ): Promise<ElderDto> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanManageOnCity(ability, 'Elder', cityId);
    await this.requireCity(cityId);

    return this.toDto(await this.requireElder(cityId, elderId));
  }

  async create(
    cityId: string,
    dto: CreateElderDto,
    actor: UserWithMemberships
  ): Promise<ElderDto> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'create', 'Elder', cityId);
    await this.requireCity(cityId);

    const parsed = this.parseOrThrow(
      createElderSchema.safeParse(dto),
      'elders.invalid'
    );
    const contacts = parsed.contacts ?? [];
    this.assertAtMostOnePrimary(contacts);

    const hasCoords = parsed.lat != null && parsed.lng != null;
    const geocodeStatus =
      parsed.geocodeStatus ?? (hasCoords ? 'manual' : 'pending');

    const created = await this.prisma.$transaction(async (tx) => {
      const elder = await tx.elder.create({
        data: {
          cityId,
          fullName: parsed.fullName,
          phone: parsed.phone ?? null,
          phoneAlt: parsed.phoneAlt ?? null,
          language: parsed.language ?? 'he',
          street: parsed.street,
          houseNumber: parsed.houseNumber,
          entrance: parsed.entrance ?? null,
          floor: parsed.floor ?? null,
          apartment: parsed.apartment ?? null,
          buildingCode: parsed.buildingCode ?? null,
          addressNotes: parsed.addressNotes ?? null,
          lat: parsed.lat ?? null,
          lng: parsed.lng ?? null,
          geocodeStatus,
          status: parsed.status ?? 'active',
          statusReason: parsed.statusReason ?? null,
          notes: parsed.notes ?? null,
        },
      });

      if (contacts.length > 0) {
        await tx.elderContact.createMany({
          data: contacts.map((contact) => ({
            elderId: elder.id,
            cityId,
            name: contact.name,
            relation: contact.relation,
            phone: contact.phone,
            isPrimary: contact.isPrimary,
          })),
        });
      }

      return tx.elder.findUniqueOrThrow({
        where: { id: elder.id },
        include: CONTACT_INCLUDE,
      });
    });

    return this.toDto(created);
  }

  async update(
    cityId: string,
    elderId: string,
    dto: UpdateElderDto,
    actor: UserWithMemberships
  ): Promise<ElderDto> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'update', 'Elder', cityId);
    await this.requireCity(cityId);
    const existing = await this.requireElder(cityId, elderId);

    if (existing.archivedAt) {
      throw new BadRequestException('elders.already_deactivated');
    }
    if (dto.status === 'removed') {
      throw new BadRequestException('elders.use_deactivate');
    }

    const parsed = this.parseOrThrow(
      updateElderSchema.safeParse(dto),
      'elders.invalid'
    );
    if (parsed.contacts) {
      this.assertAtMostOnePrimary(parsed.contacts);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.elder.update({
        where: { id: elderId },
        data: this.toUpdateData(parsed),
      });

      if (parsed.contacts) {
        await tx.elderContact.deleteMany({ where: { elderId, cityId } });
        if (parsed.contacts.length > 0) {
          await tx.elderContact.createMany({
            data: parsed.contacts.map((contact) => ({
              elderId,
              cityId,
              name: contact.name,
              relation: contact.relation,
              phone: contact.phone,
              isPrimary: contact.isPrimary,
            })),
          });
        }
      }

      return tx.elder.findUniqueOrThrow({
        where: { id: elderId },
        include: CONTACT_INCLUDE,
      });
    });

    return this.toDto(updated);
  }

  async deactivate(
    cityId: string,
    elderId: string,
    actor: UserWithMemberships
  ): Promise<ElderDto> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'delete', 'Elder', cityId);
    await this.requireCity(cityId);

    const existing = await this.requireElder(cityId, elderId);
    if (existing.archivedAt) {
      throw new BadRequestException('elders.already_deactivated');
    }

    const updated = await this.prisma.elder.update({
      where: { id: elderId },
      data: {
        archivedAt: new Date(),
        status: 'removed',
      },
      include: CONTACT_INCLUDE,
    });

    return this.toDto(updated);
  }

  private toUpdateData(parsed: UpdateElder): Prisma.ElderUpdateInput {
    const data: Prisma.ElderUpdateInput = {};

    if (parsed.fullName !== undefined) {
      data.fullName = parsed.fullName;
    }
    if (parsed.phone !== undefined) {
      data.phone = parsed.phone;
    }
    if (parsed.phoneAlt !== undefined) {
      data.phoneAlt = parsed.phoneAlt;
    }
    if (parsed.language !== undefined) {
      data.language = parsed.language;
    }
    if (parsed.street !== undefined) {
      data.street = parsed.street;
    }
    if (parsed.houseNumber !== undefined) {
      data.houseNumber = parsed.houseNumber;
    }
    if (parsed.entrance !== undefined) {
      data.entrance = parsed.entrance;
    }
    if (parsed.floor !== undefined) {
      data.floor = parsed.floor;
    }
    if (parsed.apartment !== undefined) {
      data.apartment = parsed.apartment;
    }
    if (parsed.buildingCode !== undefined) {
      data.buildingCode = parsed.buildingCode;
    }
    if (parsed.addressNotes !== undefined) {
      data.addressNotes = parsed.addressNotes;
    }
    if (parsed.lat !== undefined) {
      data.lat = parsed.lat;
    }
    if (parsed.lng !== undefined) {
      data.lng = parsed.lng;
    }
    if (parsed.geocodeStatus !== undefined) {
      data.geocodeStatus = parsed.geocodeStatus;
    } else if (parsed.lat !== undefined && parsed.lng !== undefined) {
      data.geocodeStatus =
        parsed.lat !== null && parsed.lng !== null ? 'manual' : 'pending';
    }
    if (parsed.status !== undefined) {
      data.status = parsed.status;
    }
    if (parsed.statusReason !== undefined) {
      data.statusReason = parsed.statusReason;
    }
    if (parsed.notes !== undefined) {
      data.notes = parsed.notes;
    }

    return data;
  }

  private assertAtMostOnePrimary(contacts: ElderContactInput[]): void {
    const primaryCount = contacts.filter((contact) => contact.isPrimary).length;
    if (primaryCount > 1) {
      throw new BadRequestException('elders.multiple_primary_contacts');
    }
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
    if (issue?.message === 'elders.lat_lng_required') {
      throw new BadRequestException('elders.lat_lng_required');
    }
    if (issue?.message === 'elders.use_deactivate') {
      throw new BadRequestException('elders.use_deactivate');
    }
    throw new BadRequestException(fallback);
  }

  private async requireCity(cityId: string): Promise<void> {
    const city = await this.prisma.city.findUnique({
      where: { id: cityId },
    });
    if (!city || city.archivedAt) {
      throw new NotFoundException('cities.not_found');
    }
  }

  private async requireElder(
    cityId: string,
    elderId: string
  ): Promise<ElderWithContacts> {
    const elder = await this.prisma.elder.findFirst({
      where: { id: elderId, cityId },
      include: CONTACT_INCLUDE,
    });
    if (!elder) {
      throw new NotFoundException('elders.not_found');
    }
    return elder;
  }

  private toDto(elder: ElderWithContacts): ElderDto {
    return elderSchema.parse({
      id: elder.id,
      cityId: elder.cityId,
      fullName: elder.fullName,
      phone: elder.phone,
      phoneAlt: elder.phoneAlt,
      language: elder.language,
      street: elder.street,
      houseNumber: elder.houseNumber,
      entrance: elder.entrance,
      floor: elder.floor,
      apartment: elder.apartment,
      buildingCode: elder.buildingCode,
      addressNotes: elder.addressNotes,
      lat: this.toNumber(elder.lat),
      lng: this.toNumber(elder.lng),
      geocodeStatus: elder.geocodeStatus,
      status: elder.status,
      statusReason: elder.statusReason,
      notes: elder.notes,
      archivedAt: elder.archivedAt ? elder.archivedAt.toISOString() : null,
      createdAt: elder.createdAt.toISOString(),
      updatedAt: elder.updatedAt.toISOString(),
      contacts: elder.contacts.map((contact) => ({
        id: contact.id,
        name: contact.name,
        relation: contact.relation,
        phone: contact.phone,
        isPrimary: contact.isPrimary,
      })),
    });
  }

  private toNumber(value: Prisma.Decimal | number | null): number | null {
    if (value === null) {
      return null;
    }
    return typeof value === 'number' ? value : value.toNumber();
  }
}
