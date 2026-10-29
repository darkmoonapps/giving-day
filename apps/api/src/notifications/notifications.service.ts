import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  announceDistributionDayResultSchema,
  type AnnounceDistributionDayResult,
  type Locale,
  type TemplateKey,
} from '@giving-day/shared';
import type {
  DistributionDay,
  MessageTemplate,
  PushSubscription as PrismaPushSubscription,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { formatDateOnly, formatTime } from '../common/time-of-day';
import { defaultCopyFor, renderTemplate } from './message-copy';
import {
  NOTIFICATION_PROVIDER,
  type NotificationPayload,
  type NotificationProvider,
} from './notification.provider';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(NOTIFICATION_PROVIDER)
    private readonly provider: NotificationProvider
  ) {}

  async announceDistributionDay(
    day: DistributionDay
  ): Promise<AnnounceDistributionDayResult> {
    const memberships = await this.prisma.cityMembership.findMany({
      where: {
        cityId: day.cityId,
        role: 'volunteer',
        status: 'active',
        user: { archivedAt: null },
      },
      select: {
        userId: true,
        user: { select: { id: true, locale: true } },
      },
    });

    const result = {
      attempted: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    };

    for (const membership of memberships) {
      result.attempted += 1;
      const status = await this.notifyUser({
        userId: membership.userId,
        cityId: day.cityId,
        locale: membership.user.locale,
        templateKey: 'day_invite',
        dayId: day.id,
        dedupeKey: `day_invite:${day.id}:${membership.userId}`,
        vars: {
          date: formatDateOnly(day.date),
          startTime: formatTime(day.startTime),
          endTime: formatTime(day.endTime),
        },
        data: {
          dayId: day.id,
          cityId: day.cityId,
          date: formatDateOnly(day.date),
        },
      });

      if (status === 'skipped') {
        result.skipped += 1;
      } else if (status === 'sent') {
        result.sent += 1;
      } else {
        result.failed += 1;
      }
    }

    return announceDistributionDayResultSchema.parse(result);
  }

  async notifyUser(input: {
    userId: string;
    cityId: string;
    locale: Locale;
    templateKey: TemplateKey;
    dayId?: string;
    deliveryId?: string;
    dedupeKey: string;
    vars: Record<string, string>;
    data: Record<string, string>;
  }): Promise<'sent' | 'failed' | 'skipped'> {
    const existing = await this.prisma.notificationLog.findUnique({
      where: { dedupeKey: input.dedupeKey },
    });
    if (existing) {
      return 'skipped';
    }

    const copy = await this.resolveCopy(
      input.cityId,
      input.templateKey,
      input.locale
    );
    const payload: NotificationPayload = {
      userId: input.userId,
      cityId: input.cityId,
      templateKey: input.templateKey,
      title: renderTemplate(copy.title, input.vars),
      body: renderTemplate(copy.body, input.vars),
      data: input.data,
      dayId: input.dayId,
      deliveryId: input.deliveryId,
      dedupeKey: input.dedupeKey,
    };

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId: input.userId, disabledAt: null },
    });

    if (subscriptions.length === 0) {
      await this.writeLog(payload, 'failed', 'notifications.no_subscription');
      return 'failed';
    }

    let anySent = false;
    let lastError: string | undefined;

    for (const subscription of subscriptions) {
      const result = await this.provider.send(
        {
          endpoint: subscription.endpoint,
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
        payload
      );

      await this.recordSubscriptionResult(subscription, result);

      if (result.ok) {
        anySent = true;
      } else {
        lastError = result.error ?? 'notifications.send_failed';
      }
    }

    if (anySent) {
      await this.writeLog(payload, 'sent');
      return 'sent';
    }

    await this.writeLog(
      payload,
      'failed',
      lastError ?? 'notifications.send_failed'
    );
    return 'failed';
  }

  private async recordSubscriptionResult(
    subscription: PrismaPushSubscription,
    result: { ok: boolean; gone?: boolean }
  ): Promise<void> {
    if (result.ok) {
      await this.prisma.pushSubscription.update({
        where: { id: subscription.id },
        data: { lastSuccessAt: new Date(), failedCount: 0 },
      });
      return;
    }

    await this.prisma.pushSubscription.update({
      where: { id: subscription.id },
      data: {
        failedCount: { increment: 1 },
        disabledAt: result.gone ? new Date() : subscription.disabledAt,
      },
    });
  }

  private async resolveCopy(
    cityId: string,
    templateKey: TemplateKey,
    locale: Locale
  ): Promise<{ title: string; body: string }> {
    const templates = await this.prisma.messageTemplate.findMany({
      where: {
        key: templateKey,
        locale,
        OR: [{ cityId }, { cityId: null }],
      },
    });

    const cityTemplate = templates.find(
      (template) => template.cityId === cityId
    );
    const globalTemplate = templates.find(
      (template) => template.cityId === null
    );
    const chosen: MessageTemplate | undefined = cityTemplate ?? globalTemplate;
    if (chosen) {
      return { title: chosen.title, body: chosen.body };
    }

    return defaultCopyFor(templateKey, locale);
  }

  private async writeLog(
    payload: NotificationPayload,
    status: 'sent' | 'failed',
    error?: string
  ): Promise<void> {
    try {
      await this.prisma.notificationLog.create({
        data: {
          cityId: payload.cityId,
          userId: payload.userId,
          templateKey: payload.templateKey,
          channel: 'push',
          dayId: payload.dayId,
          deliveryId: payload.deliveryId,
          dedupeKey: payload.dedupeKey,
          status,
          error: error ?? null,
          sentAt: new Date(),
        },
      });
    } catch (error: unknown) {
      this.logger.warn(
        `Could not persist notification log ${payload.dedupeKey}: ${
          error instanceof Error ? error.message : 'unknown_error'
        }`
      );
    }
  }
}
