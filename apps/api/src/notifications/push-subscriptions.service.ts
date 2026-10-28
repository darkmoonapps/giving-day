import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { subject } from '@casl/ability';
import {
  pushSubscriptionSchema,
  pushSubscriptionsResponseSchema,
  vapidPublicKeySchema,
  type PushSubscription,
  type PushSubscriptionsResponse,
  type VapidPublicKey,
} from '@giving-day/shared';
import { Prisma } from '@prisma/client';
import type { PushSubscription as PrismaPushSubscription } from '@prisma/client';
import {
  AbilityFactory,
  type AppSubjects,
  type UserWithMemberships,
} from '../abilities/ability.factory';
import { PrismaService } from '../prisma/prisma.service';
import type { UpsertPushSubscriptionDto } from './dto/upsert-push-subscription.dto';
import {
  isWebPushConfigured,
  vapidPublicKeyFromEnv,
} from './notification.provider';

@Injectable()
export class PushSubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly abilityFactory: AbilityFactory
  ) {}

  getVapidPublicKey(): VapidPublicKey {
    const publicKey = vapidPublicKeyFromEnv();
    return vapidPublicKeySchema.parse({
      publicKey,
      configured: isWebPushConfigured(),
    });
  }

  async listMine(
    actor: UserWithMemberships
  ): Promise<PushSubscriptionsResponse> {
    this.assertOwn(actor);

    const rows = await this.prisma.pushSubscription.findMany({
      where: { userId: actor.id },
      orderBy: { createdAt: 'desc' },
    });

    return pushSubscriptionsResponseSchema.parse({
      subscriptions: rows.map((row) => this.toDto(row)),
    });
  }

  async upsertMine(
    dto: UpsertPushSubscriptionDto,
    actor: UserWithMemberships
  ): Promise<PushSubscription> {
    this.assertOwn(actor);

    const existing = await this.prisma.pushSubscription.findUnique({
      where: { endpoint: dto.endpoint },
    });

    if (existing && existing.userId !== actor.id) {
      throw new ConflictException('notifications.endpoint_taken');
    }

    const userAgent = dto.userAgent ?? existing?.userAgent ?? '';

    try {
      const row = existing
        ? await this.prisma.pushSubscription.update({
            where: { id: existing.id },
            data: {
              p256dh: dto.p256dh,
              auth: dto.auth,
              userAgent,
              disabledAt: null,
              failedCount: 0,
            },
          })
        : await this.prisma.pushSubscription.create({
            data: {
              userId: actor.id,
              endpoint: dto.endpoint,
              p256dh: dto.p256dh,
              auth: dto.auth,
              userAgent,
            },
          });

      return this.toDto(row);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('notifications.endpoint_taken');
      }
      throw error;
    }
  }

  async deleteMine(
    subscriptionId: string,
    actor: UserWithMemberships
  ): Promise<void> {
    this.assertOwn(actor);

    const existing = await this.prisma.pushSubscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!existing || existing.userId !== actor.id) {
      throw new NotFoundException('notifications.not_found');
    }

    await this.prisma.pushSubscription.delete({
      where: { id: existing.id },
    });
  }

  private assertOwn(actor: UserWithMemberships): void {
    const ability = this.abilityFactory.createForUser(actor);
    const instance = subject('PushSubscription', {
      userId: actor.id,
    }) as AppSubjects;
    if (ability.cannot('manage', instance)) {
      throw new NotFoundException('notifications.not_found');
    }
  }

  private toDto(row: PrismaPushSubscription): PushSubscription {
    return pushSubscriptionSchema.parse({
      id: row.id,
      endpoint: row.endpoint,
      userAgent: row.userAgent,
      createdAt: row.createdAt.toISOString(),
      lastSuccessAt: row.lastSuccessAt ? row.lastSuccessAt.toISOString() : null,
      failedCount: row.failedCount,
      disabledAt: row.disabledAt ? row.disabledAt.toISOString() : null,
    });
  }
}
