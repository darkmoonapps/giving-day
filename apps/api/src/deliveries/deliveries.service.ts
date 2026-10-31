import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  assignDeliverySchema,
  coordinatorDeliveriesResponseSchema,
  coordinatorDeliverySchema,
  rankReplacementSuggestions,
  updateDeliveryStatusSchema,
  volunteerDeliveriesResponseSchema,
  volunteerDeliverySchema,
  type AssignDelivery,
  type CoordinatorDeliveriesResponse,
  type CoordinatorDelivery,
  type DayDeliveriesResponse,
  type ReplacementVolunteerCandidate,
  type UpdateDeliveryStatus,
  type VolunteerDeliveriesResponse,
  type VolunteerDelivery,
} from '@giving-day/shared';
import { UpdateDeliveryStatusDto } from './dto/update-delivery-status.dto';
import type {
  DeliveryStatus,
  Prisma,
  DistributionDay as PrismaDistributionDay,
} from '@prisma/client';
import {
  AbilityFactory,
  type UserWithMemberships,
} from '../abilities/ability.factory';
import { assertCanOnCity } from '../cities/city-access';
import { PrismaService } from '../prisma/prisma.service';

const REASSIGNABLE_STATUSES: DeliveryStatus[] = ['unassigned', 'assigned'];

type PrefillMatch = {
  id: string;
  elderId: string;
  volunteerId: string;
};

type PrefillRow = {
  cityId: string;
  dayId: string;
  elderId: string;
  volunteerId: string | null;
  matchId: string | null;
  status: 'assigned' | 'unassigned';
  assignedAt: Date | null;
};

const ELDER_SELECT = {
  id: true,
  fullName: true,
  street: true,
  houseNumber: true,
  entrance: true,
  floor: true,
  apartment: true,
  addressNotes: true,
  notes: true,
  contacts: {
    select: {
      name: true,
      relation: true,
      phone: true,
      isPrimary: true,
    },
    orderBy: [{ isPrimary: 'desc' as const }, { name: 'asc' as const }],
  },
} satisfies Prisma.ElderSelect;

const VOLUNTEER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
} as const;

type DeliveryWithRelations = Prisma.DeliveryGetPayload<{
  include: {
    elder: { select: typeof ELDER_SELECT };
    volunteer: { select: typeof VOLUNTEER_SELECT };
  };
}>;

@Injectable()
export class DeliveriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly abilityFactory: AbilityFactory
  ) {}

  async prefillFromPermanentMatches(
    tx: Prisma.TransactionClient,
    params: { cityId: string; dayId: string; actorId: string }
  ): Promise<number> {
    const [elders, matches, existing] = await Promise.all([
      tx.elder.findMany({
        where: {
          cityId: params.cityId,
          status: 'active',
          archivedAt: null,
        },
        select: { id: true },
      }),
      tx.match.findMany({
        where: {
          cityId: params.cityId,
          type: 'permanent',
          endsAt: null,
          elder: {
            cityId: params.cityId,
            status: 'active',
            archivedAt: null,
          },
          volunteer: {
            archivedAt: null,
            memberships: {
              some: {
                cityId: params.cityId,
                role: 'volunteer',
                status: 'active',
              },
            },
          },
        },
        select: {
          id: true,
          elderId: true,
          volunteerId: true,
        },
      }),
      tx.delivery.findMany({
        where: { cityId: params.cityId, dayId: params.dayId },
        select: { elderId: true },
      }),
    ]);

    const matchByElder = new Map<string, PrefillMatch>();
    for (const match of matches) {
      if (!matchByElder.has(match.elderId)) {
        matchByElder.set(match.elderId, match);
      }
    }

    const existingElderIds = new Set(existing.map((row) => row.elderId));
    const assignedAt = new Date();
    const rows = this.buildPrefillRows({
      cityId: params.cityId,
      dayId: params.dayId,
      elders,
      matchByElder,
      existingElderIds,
      assignedAt,
    });

    if (rows.length === 0) {
      return 0;
    }

    await tx.delivery.createMany({
      data: rows,
      skipDuplicates: true,
    });

    const created = await tx.delivery.findMany({
      where: {
        cityId: params.cityId,
        dayId: params.dayId,
        elderId: { in: rows.map((row) => row.elderId) },
      },
      select: {
        id: true,
        volunteerId: true,
        status: true,
        _count: { select: { events: true } },
      },
    });

    const newDeliveries = created.filter(
      (delivery) => delivery._count.events === 0
    );
    if (newDeliveries.length === 0) {
      return 0;
    }

    await tx.deliveryEvent.createMany({
      data: newDeliveries.map((delivery) => ({
        deliveryId: delivery.id,
        fromStatus: 'unassigned',
        toStatus: delivery.status,
        fromVolunteerId: null,
        toVolunteerId: delivery.volunteerId,
        actorId: params.actorId,
        at: assignedAt,
      })),
    });

    return newDeliveries.length;
  }

  private buildPrefillRows(params: {
    cityId: string;
    dayId: string;
    elders: Array<{ id: string }>;
    matchByElder: Map<string, PrefillMatch>;
    existingElderIds: Set<string>;
    assignedAt: Date;
  }): PrefillRow[] {
    const rows: PrefillRow[] = [];
    for (const elder of params.elders) {
      if (params.existingElderIds.has(elder.id)) {
        continue;
      }

      const match = params.matchByElder.get(elder.id);
      if (match === undefined) {
        rows.push({
          cityId: params.cityId,
          dayId: params.dayId,
          elderId: elder.id,
          volunteerId: null,
          matchId: null,
          status: 'unassigned',
          assignedAt: null,
        });
        continue;
      }

      rows.push({
        cityId: params.cityId,
        dayId: params.dayId,
        elderId: elder.id,
        volunteerId: match.volunteerId,
        matchId: match.id,
        status: 'assigned',
        assignedAt: params.assignedAt,
      });
    }

    return rows;
  }

  async list(
    cityId: string,
    dayId: string,
    actor: UserWithMemberships
  ): Promise<DayDeliveriesResponse> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'read', 'Delivery', cityId);
    await this.requireCity(cityId);
    await this.requireDay(cityId, dayId);

    if (this.canSeeInternal(actor, cityId)) {
      return this.listForCoordinator(cityId, dayId);
    }

    return this.listForVolunteer(cityId, dayId, actor.id);
  }

  async assign(
    cityId: string,
    dayId: string,
    deliveryId: string,
    dto: AssignDelivery,
    actor: UserWithMemberships
  ): Promise<CoordinatorDelivery> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'reassign', 'Delivery', cityId);
    await this.requireCity(cityId);

    const day = await this.requireDay(cityId, dayId);
    if (!this.isOpen(day.status)) {
      throw new BadRequestException('deliveries.day_not_open');
    }

    const payload = assignDeliverySchema.parse(dto);

    const assignedAt = payload.volunteerId === null ? null : new Date();
    const nextStatus = payload.volunteerId === null ? 'unassigned' : 'assigned';

    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.delivery.findFirst({
        where: { id: deliveryId, cityId, dayId },
      });
      if (current === null) {
        throw new NotFoundException('deliveries.not_found');
      }

      if (payload.volunteerId !== null) {
        await this.requireAssignableVolunteer(
          tx,
          cityId,
          dayId,
          payload.volunteerId
        );
      }

      const result = await tx.delivery.updateMany({
        where: {
          id: current.id,
          cityId,
          dayId,
          status: { in: REASSIGNABLE_STATUSES },
        },
        data: {
          volunteerId: payload.volunteerId,
          status: nextStatus,
          assignedAt,
        },
      });

      if (result.count === 0) {
        throw new BadRequestException('deliveries.not_reassignable');
      }

      const row = await tx.delivery.findFirst({
        where: { id: current.id, cityId, dayId },
        include: {
          elder: { select: ELDER_SELECT },
          volunteer: { select: VOLUNTEER_SELECT },
        },
      });
      if (row === null) {
        throw new NotFoundException('deliveries.not_found');
      }

      await tx.deliveryEvent.create({
        data: {
          deliveryId: row.id,
          fromStatus: current.status,
          toStatus: row.status,
          fromVolunteerId: current.volunteerId,
          toVolunteerId: row.volunteerId,
          actorId: actor.id,
          at: assignedAt ?? new Date(),
        },
      });

      return row;
    });

    return this.toCoordinatorDelivery(
      updated,
      updated.volunteerId === null
        ? await this.loadAssignableCandidates(cityId, dayId)
        : []
    );
  }

  async updateStatus(
    cityId: string,
    dayId: string,
    deliveryId: string,
    dto: UpdateDeliveryStatusDto,
    actor: UserWithMemberships
  ): Promise<VolunteerDelivery> {
    const ability = this.abilityFactory.createForUser(actor);
    assertCanOnCity(ability, 'update', 'Delivery', cityId);
    await this.requireCity(cityId);

    const day = await this.requireDay(cityId, dayId);
    if (!this.isOpen(day.status)) {
      throw new BadRequestException('deliveries.day_not_open');
    }

    const parsed = updateDeliveryStatusSchema.safeParse(dto);
    if (!parsed.success) {
      throw new BadRequestException('deliveries.invalid_status');
    }

    const payload = parsed.data;
    const expectedFrom = this.expectedStatusForTransition(payload.status);

    const participation = await this.prisma.dayParticipation.findUnique({
      where: {
        dayId_volunteerId: { dayId, volunteerId: actor.id },
      },
    });
    if (
      participation === null ||
      participation.cityId !== cityId ||
      participation.status !== 'confirmed'
    ) {
      throw new BadRequestException('deliveries.not_confirmed');
    }

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.delivery.findFirst({
        where: {
          id: deliveryId,
          cityId,
          dayId,
          volunteerId: actor.id,
        },
      });
      if (current === null) {
        throw new NotFoundException('deliveries.not_found');
      }

      if (current.status !== expectedFrom) {
        throw new BadRequestException('deliveries.invalid_transition');
      }

      const result = await tx.delivery.updateMany({
        where: {
          id: current.id,
          cityId,
          dayId,
          volunteerId: actor.id,
          status: expectedFrom,
        },
        data: this.statusUpdateData(payload, now),
      });

      if (result.count === 0) {
        throw new BadRequestException('deliveries.invalid_transition');
      }

      const row = await tx.delivery.findFirst({
        where: { id: current.id, cityId, dayId },
        include: {
          elder: { select: ELDER_SELECT },
          volunteer: { select: VOLUNTEER_SELECT },
        },
      });
      if (row === null) {
        throw new NotFoundException('deliveries.not_found');
      }

      await tx.deliveryEvent.create({
        data: {
          deliveryId: row.id,
          fromStatus: current.status,
          toStatus: row.status,
          fromVolunteerId: current.volunteerId,
          toVolunteerId: row.volunteerId,
          actorId: actor.id,
          note: payload.status === 'not_delivered' ? payload.note : null,
          at: now,
        },
      });

      return row;
    });

    return this.toVolunteerDelivery(updated);
  }

  private async listForCoordinator(
    cityId: string,
    dayId: string
  ): Promise<CoordinatorDeliveriesResponse> {
    const [deliveries, candidates] = await Promise.all([
      this.prisma.delivery.findMany({
        where: { cityId, dayId },
        include: {
          elder: { select: ELDER_SELECT },
          volunteer: { select: VOLUNTEER_SELECT },
        },
      }),
      this.loadAssignableCandidates(cityId, dayId),
    ]);

    const sorted = this.sortDeliveries(deliveries);

    return coordinatorDeliveriesResponseSchema.parse({
      dayId,
      cityId,
      unassignedCount: sorted.filter((row) => row.volunteerId === null).length,
      assignableVolunteers: candidates.map((volunteer) => ({
        id: volunteer.id,
        firstName: volunteer.firstName,
        lastName: volunteer.lastName,
      })),
      deliveries: sorted.map((row) =>
        this.toCoordinatorDelivery(row, candidates)
      ),
    });
  }

  private async loadAssignableCandidates(
    cityId: string,
    dayId: string
  ): Promise<ReplacementVolunteerCandidate[]> {
    const confirmed = await this.prisma.dayParticipation.findMany({
      where: this.confirmedAssignableWhere(cityId, dayId),
      select: {
        volunteer: {
          select: {
            ...VOLUNTEER_SELECT,
            memberships: {
              where: {
                cityId,
                role: 'volunteer',
                status: 'active',
              },
              select: { homeArea: true },
              take: 1,
            },
          },
        },
      },
      orderBy: [
        { volunteer: { lastName: 'asc' } },
        { volunteer: { firstName: 'asc' } },
      ],
    });

    return confirmed.map((row) => ({
      id: row.volunteer.id,
      firstName: row.volunteer.firstName,
      lastName: row.volunteer.lastName,
      homeArea: row.volunteer.memberships?.[0]?.homeArea ?? null,
    }));
  }

  private async listForVolunteer(
    cityId: string,
    dayId: string,
    volunteerId: string
  ): Promise<VolunteerDeliveriesResponse> {
    const participation = await this.prisma.dayParticipation.findUnique({
      where: {
        dayId_volunteerId: { dayId, volunteerId },
      },
    });

    if (
      participation === null ||
      participation.cityId !== cityId ||
      participation.status !== 'confirmed'
    ) {
      return volunteerDeliveriesResponseSchema.parse({
        dayId,
        cityId,
        deliveries: [],
      });
    }

    const deliveries = await this.prisma.delivery.findMany({
      where: {
        cityId,
        dayId,
        volunteerId,
        status: { not: 'cancelled' },
      },
      include: {
        elder: { select: ELDER_SELECT },
        volunteer: { select: VOLUNTEER_SELECT },
      },
    });

    return volunteerDeliveriesResponseSchema.parse({
      dayId,
      cityId,
      deliveries: this.sortDeliveries(deliveries).map((row) =>
        this.toVolunteerDelivery(row)
      ),
    });
  }

  private async requireAssignableVolunteer(
    tx: Prisma.TransactionClient,
    cityId: string,
    dayId: string,
    volunteerId: string
  ): Promise<void> {
    const participation = await tx.dayParticipation.findFirst({
      where: this.confirmedAssignableWhere(cityId, dayId, volunteerId),
      select: { volunteerId: true },
    });

    if (participation === null) {
      throw new BadRequestException('deliveries.invalid_volunteer');
    }
  }

  private confirmedAssignableWhere(
    cityId: string,
    dayId: string,
    volunteerId?: string
  ): Prisma.DayParticipationWhereInput {
    return {
      cityId,
      dayId,
      status: 'confirmed',
      ...(volunteerId === undefined ? {} : { volunteerId }),
      volunteer: {
        archivedAt: null,
        memberships: {
          some: {
            cityId,
            role: 'volunteer',
            status: 'active',
          },
        },
      },
    };
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

  private sortDeliveries(
    deliveries: DeliveryWithRelations[]
  ): DeliveryWithRelations[] {
    return [...deliveries].sort((left, right) => {
      const leftUnassigned = left.volunteerId === null ? 0 : 1;
      const rightUnassigned = right.volunteerId === null ? 0 : 1;
      if (leftUnassigned !== rightUnassigned) {
        return leftUnassigned - rightUnassigned;
      }
      return left.elder.fullName.localeCompare(right.elder.fullName, 'he');
    });
  }

  private expectedStatusForTransition(
    next: UpdateDeliveryStatus['status']
  ): DeliveryStatus {
    if (next === 'picked') {
      return 'assigned';
    }
    return 'picked';
  }

  private statusUpdateData(
    payload: UpdateDeliveryStatus,
    now: Date
  ): Prisma.DeliveryUncheckedUpdateManyInput {
    if (payload.status === 'picked') {
      return { status: 'picked', pickedAt: now };
    }
    if (payload.status === 'delivered') {
      return { status: 'delivered', finalAt: now };
    }
    return {
      status: 'not_delivered',
      note: payload.note,
      notDeliveredReason: payload.notDeliveredReason,
      finalAt: now,
    };
  }

  private toVolunteerDelivery(row: DeliveryWithRelations): VolunteerDelivery {
    return volunteerDeliverySchema.parse({
      id: row.id,
      cityId: row.cityId,
      dayId: row.dayId,
      status: row.status,
      note: row.note,
      notDeliveredReason: row.notDeliveredReason,
      elder: row.elder,
    });
  }

  private toCoordinatorDelivery(
    row: DeliveryWithRelations,
    candidates: readonly ReplacementVolunteerCandidate[]
  ): CoordinatorDelivery {
    return coordinatorDeliverySchema.parse({
      id: row.id,
      cityId: row.cityId,
      dayId: row.dayId,
      status: row.status,
      note: row.note,
      notDeliveredReason: row.notDeliveredReason,
      volunteerId: row.volunteerId,
      matchId: row.matchId,
      assignedAt: row.assignedAt ? row.assignedAt.toISOString() : null,
      volunteer: row.volunteer,
      elder: row.elder,
      replacementSuggestions:
        row.volunteerId === null
          ? rankReplacementSuggestions(
              {
                street: row.elder.street,
                addressNotes: row.elder.addressNotes,
              },
              candidates
            )
          : [],
    });
  }
}
