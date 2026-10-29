import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  assignDeliverySchema,
  coordinatorDeliveriesResponseSchema,
  coordinatorDeliverySchema,
  volunteerDeliveriesResponseSchema,
  volunteerDeliverySchema,
  type AssignDelivery,
  type CoordinatorDeliveriesResponse,
  type CoordinatorDelivery,
  type DayDeliveriesResponse,
  type VolunteerDeliveriesResponse,
} from '@giving-day/shared';
import type { Prisma } from '@prisma/client';
import type { DistributionDay as PrismaDistributionDay } from '@prisma/client';
import {
  AbilityFactory,
  type UserWithMemberships,
} from '../abilities/ability.factory';
import { assertCanOnCity } from '../cities/city-access';
import { PrismaService } from '../prisma/prisma.service';

const REASSIGNABLE_STATUSES = new Set(['unassigned', 'assigned']);

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
} as const;

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
    const matches = await tx.match.findMany({
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
    });

    const uniqueByElder = new Map<
      string,
      { id: string; elderId: string; volunteerId: string }
    >();
    for (const match of matches) {
      if (!uniqueByElder.has(match.elderId)) {
        uniqueByElder.set(match.elderId, match);
      }
    }

    const rows = [...uniqueByElder.values()];
    if (rows.length === 0) {
      return 0;
    }

    const assignedAt = new Date();
    await tx.delivery.createMany({
      data: rows.map((match) => ({
        cityId: params.cityId,
        dayId: params.dayId,
        elderId: match.elderId,
        volunteerId: match.volunteerId,
        matchId: match.id,
        status: 'assigned',
        assignedAt,
      })),
    });

    const created = await tx.delivery.findMany({
      where: { cityId: params.cityId, dayId: params.dayId },
      select: { id: true, volunteerId: true, status: true },
    });

    if (created.length === 0) {
      return 0;
    }

    await tx.deliveryEvent.createMany({
      data: created.map((delivery) => ({
        deliveryId: delivery.id,
        fromStatus: 'unassigned',
        toStatus: delivery.status,
        fromVolunteerId: null,
        toVolunteerId: delivery.volunteerId,
        actorId: params.actorId,
        at: assignedAt,
      })),
    });

    return created.length;
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
    const delivery = await this.prisma.delivery.findFirst({
      where: { id: deliveryId, cityId, dayId },
    });
    if (delivery === null) {
      throw new NotFoundException('deliveries.not_found');
    }

    if (!REASSIGNABLE_STATUSES.has(delivery.status)) {
      throw new BadRequestException('deliveries.not_reassignable');
    }

    if (payload.volunteerId !== null) {
      await this.requireAssignableVolunteer(cityId, payload.volunteerId);
    }

    const assignedAt = payload.volunteerId === null ? null : new Date();
    const nextStatus = payload.volunteerId === null ? 'unassigned' : 'assigned';

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.delivery.update({
        where: { id: delivery.id },
        data: {
          volunteerId: payload.volunteerId,
          status: nextStatus,
          assignedAt,
        },
        include: {
          elder: { select: ELDER_SELECT },
          volunteer: { select: VOLUNTEER_SELECT },
        },
      });

      await tx.deliveryEvent.create({
        data: {
          deliveryId: row.id,
          fromStatus: delivery.status,
          toStatus: row.status,
          fromVolunteerId: delivery.volunteerId,
          toVolunteerId: row.volunteerId,
          actorId: actor.id,
          at: assignedAt ?? new Date(),
        },
      });

      return row;
    });

    return this.toCoordinatorDelivery(updated);
  }

  private async listForCoordinator(
    cityId: string,
    dayId: string
  ): Promise<CoordinatorDeliveriesResponse> {
    const [deliveries, volunteers] = await Promise.all([
      this.prisma.delivery.findMany({
        where: { cityId, dayId },
        include: {
          elder: { select: ELDER_SELECT },
          volunteer: { select: VOLUNTEER_SELECT },
        },
      }),
      this.prisma.cityMembership.findMany({
        where: {
          cityId,
          role: 'volunteer',
          status: 'active',
          user: { archivedAt: null },
        },
        select: {
          user: {
            select: VOLUNTEER_SELECT,
          },
        },
        orderBy: [
          { user: { lastName: 'asc' } },
          { user: { firstName: 'asc' } },
        ],
      }),
    ]);

    const sorted = this.sortDeliveries(deliveries);

    return coordinatorDeliveriesResponseSchema.parse({
      dayId,
      cityId,
      unassignedCount: sorted.filter((row) => row.volunteerId === null).length,
      assignableVolunteers: volunteers.map((membership) => membership.user),
      deliveries: sorted.map((row) => this.toCoordinatorDelivery(row)),
    });
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
    cityId: string,
    volunteerId: string
  ): Promise<void> {
    const membership = await this.prisma.cityMembership.findUnique({
      where: {
        cityId_userId: { cityId, userId: volunteerId },
      },
      select: {
        role: true,
        status: true,
        user: { select: { archivedAt: true } },
      },
    });

    if (
      membership === null ||
      membership.role !== 'volunteer' ||
      membership.status !== 'active' ||
      membership.user.archivedAt !== null
    ) {
      throw new BadRequestException('deliveries.invalid_volunteer');
    }
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

  private toVolunteerDelivery(row: DeliveryWithRelations): {
    id: string;
    cityId: string;
    dayId: string;
    status: DeliveryWithRelations['status'];
    elder: DeliveryWithRelations['elder'];
  } {
    return volunteerDeliverySchema.parse({
      id: row.id,
      cityId: row.cityId,
      dayId: row.dayId,
      status: row.status,
      elder: row.elder,
    });
  }

  private toCoordinatorDelivery(
    row: DeliveryWithRelations
  ): CoordinatorDelivery {
    return coordinatorDeliverySchema.parse({
      id: row.id,
      cityId: row.cityId,
      dayId: row.dayId,
      status: row.status,
      volunteerId: row.volunteerId,
      matchId: row.matchId,
      assignedAt: row.assignedAt ? row.assignedAt.toISOString() : null,
      volunteer: row.volunteer,
      elder: row.elder,
    });
  }
}
