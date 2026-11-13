import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  announceDistributionDayResultSchema,
  confirmRemindersJobResultSchema,
  DEFAULT_CITY_TIMEZONE,
  pickupStatusRemindersJobResultSchema,
  type AnnounceDistributionDayResult,
  type ConfirmRemindersJobResult,
  type Locale,
  type PickupStatusRemindersJobResult,
  type TemplateKey,
} from '@giving-day/shared';
import type {
  DistributionDay,
  MessageTemplate,
  ParticipationStatus,
  PushSubscription as PrismaPushSubscription,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  formatDateOnly,
  formatTime,
  instantFromZonedParts,
  parseDateOnly,
  todayInTimeZone,
} from '../common/time-of-day';
import { defaultCopyFor, renderTemplate } from './message-copy';
import {
  NOTIFICATION_PROVIDER,
  type NotificationPayload,
  type NotificationProvider,
} from './notification.provider';

const RESPONDED_PARTICIPATION_STATUSES: readonly ParticipationStatus[] = [
  'confirmed',
  'declined',
  'cancelled',
  'no_show',
  'attended',
];

type JobCounters = {
  attempted: number;
  sent: number;
  failed: number;
  skipped: number;
  daysProcessed: number;
};

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

  /**
   * Push confirm_reminder to active volunteers who have not confirmed or
   * declined an open day, once the city's confirmReminderAfterHours have
   * elapsed since publish. Idempotent via NotificationLog.dedupeKey.
   */
  async sendConfirmReminders(
    now: Date = new Date()
  ): Promise<ConfirmRemindersJobResult> {
    const today = todayInTimeZone(DEFAULT_CITY_TIMEZONE, now);
    const openDays = await this.prisma.distributionDay.findMany({
      where: {
        status: { in: ['published', 'in_progress'] },
        publishedAt: { not: null },
        date: { gte: parseDateOnly(today) },
        city: { isActive: true, archivedAt: null },
      },
      include: {
        city: {
          select: {
            id: true,
            settings: {
              select: { confirmReminderAfterHours: true },
            },
          },
        },
      },
    });

    const result = {
      attempted: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      daysProcessed: 0,
    };

    for (const day of openDays) {
      if (formatDateOnly(day.date) < today) {
        continue;
      }

      const settings = day.city.settings;
      if (!settings || day.publishedAt === null) {
        continue;
      }

      const dueAtMs =
        day.publishedAt.getTime() +
        settings.confirmReminderAfterHours * 60 * 60 * 1000;
      if (now.getTime() < dueAtMs) {
        continue;
      }

      result.daysProcessed += 1;

      const [memberships, responded] = await Promise.all([
        this.prisma.cityMembership.findMany({
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
        }),
        this.prisma.dayParticipation.findMany({
          where: {
            cityId: day.cityId,
            dayId: day.id,
            status: { in: [...RESPONDED_PARTICIPATION_STATUSES] },
          },
          select: { volunteerId: true },
        }),
      ]);

      const respondedIds = new Set(
        responded.map((participation) => participation.volunteerId)
      );

      for (const membership of memberships) {
        if (respondedIds.has(membership.userId)) {
          continue;
        }

        result.attempted += 1;
        const status = await this.notifyUser({
          userId: membership.userId,
          cityId: day.cityId,
          locale: membership.user.locale,
          templateKey: 'confirm_reminder',
          dayId: day.id,
          dedupeKey: `confirm_reminder:${day.id}:${membership.userId}`,
          vars: {
            date: formatDateOnly(day.date),
            startTime: formatTime(day.startTime),
            endTime: formatTime(day.endTime),
          },
          data: {
            dayId: day.id,
            cityId: day.cityId,
            date: formatDateOnly(day.date),
            templateKey: 'confirm_reminder',
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
    }

    return confirmRemindersJobResultSchema.parse(result);
  }

  /**
   * On a distribution day: (a) warn volunteers who still have assigned
   * packages not marked picked within unpickedPushMinutesBeforeEnd of the
   * window end; (b) remind volunteers whose deliveries are still picked with
   * no final status after missingFinalStatusWaitHours. Idempotent via
   * NotificationLog.dedupeKey.
   */
  async sendPickupStatusReminders(
    now: Date = new Date()
  ): Promise<PickupStatusRemindersJobResult> {
    const result: JobCounters = {
      attempted: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      daysProcessed: 0,
    };

    const processedDayIds = new Set<string>();

    await this.sendUnpickedWarnings(now, result, processedDayIds);
    await this.sendFinalStatusReminders(now, result, processedDayIds);

    result.daysProcessed = processedDayIds.size;
    return pickupStatusRemindersJobResultSchema.parse(result);
  }

  private async sendUnpickedWarnings(
    now: Date,
    result: JobCounters,
    processedDayIds: Set<string>
  ): Promise<void> {
    const openDays = await this.prisma.distributionDay.findMany({
      where: {
        status: { in: ['published', 'in_progress'] },
        city: { isActive: true, archivedAt: null },
      },
      include: {
        city: {
          select: {
            id: true,
            timezone: true,
            settings: {
              select: { unpickedPushMinutesBeforeEnd: true },
            },
          },
        },
      },
    });

    for (const day of openDays) {
      const settings = day.city.settings;
      if (!settings) {
        continue;
      }

      const timeZone = day.city.timezone || DEFAULT_CITY_TIMEZONE;
      const today = todayInTimeZone(timeZone, now);
      const dayDate = formatDateOnly(day.date);
      if (dayDate !== today) {
        continue;
      }

      const endAt = instantFromZonedParts(
        dayDate,
        formatTime(day.endTime),
        timeZone
      );
      const warningAtMs =
        endAt.getTime() - settings.unpickedPushMinutesBeforeEnd * 60 * 1000;
      if (now.getTime() < warningAtMs) {
        continue;
      }

      processedDayIds.add(day.id);

      const deliveries = await this.prisma.delivery.findMany({
        where: {
          dayId: day.id,
          cityId: day.cityId,
          volunteerId: { not: null },
          status: 'assigned',
        },
        select: {
          volunteerId: true,
          volunteer: { select: { id: true, locale: true, archivedAt: true } },
        },
      });

      const seenVolunteerIds = new Set<string>();

      for (const delivery of deliveries) {
        if (delivery.volunteerId === null || delivery.volunteer === null) {
          continue;
        }
        if (delivery.volunteer.archivedAt !== null) {
          continue;
        }
        if (seenVolunteerIds.has(delivery.volunteerId)) {
          continue;
        }
        seenVolunteerIds.add(delivery.volunteerId);

        result.attempted += 1;
        const status = await this.notifyUser({
          userId: delivery.volunteerId,
          cityId: day.cityId,
          locale: delivery.volunteer.locale,
          templateKey: 'unpicked_warning',
          dayId: day.id,
          dedupeKey: `unpicked_warning:${day.id}:${delivery.volunteerId}`,
          vars: {
            date: dayDate,
            endTime: formatTime(day.endTime),
          },
          data: {
            dayId: day.id,
            cityId: day.cityId,
            date: dayDate,
            templateKey: 'unpicked_warning',
          },
        });

        this.tallyStatus(result, status);
      }
    }
  }

  private async sendFinalStatusReminders(
    now: Date,
    result: JobCounters,
    processedDayIds: Set<string>
  ): Promise<void> {
    const deliveries = await this.prisma.delivery.findMany({
      where: {
        status: 'picked',
        volunteerId: { not: null },
        pickedAt: { not: null },
        day: {
          status: { in: ['published', 'in_progress', 'closed'] },
          city: { isActive: true, archivedAt: null },
        },
      },
      select: {
        id: true,
        cityId: true,
        dayId: true,
        volunteerId: true,
        pickedAt: true,
        volunteer: { select: { id: true, locale: true, archivedAt: true } },
        day: {
          select: {
            id: true,
            date: true,
            city: {
              select: {
                settings: {
                  select: { missingFinalStatusWaitHours: true },
                },
              },
            },
          },
        },
      },
    });

    for (const delivery of deliveries) {
      if (delivery.volunteerId === null || delivery.volunteer === null) {
        continue;
      }
      if (delivery.volunteer.archivedAt !== null) {
        continue;
      }
      if (delivery.pickedAt === null) {
        continue;
      }

      const settings = delivery.day.city.settings;
      if (!settings) {
        continue;
      }

      const dueAtMs =
        delivery.pickedAt.getTime() +
        settings.missingFinalStatusWaitHours * 60 * 60 * 1000;
      if (now.getTime() < dueAtMs) {
        continue;
      }

      processedDayIds.add(delivery.dayId);

      result.attempted += 1;
      const dayDate = formatDateOnly(delivery.day.date);
      const status = await this.notifyUser({
        userId: delivery.volunteerId,
        cityId: delivery.cityId,
        locale: delivery.volunteer.locale,
        templateKey: 'final_status_reminder',
        dayId: delivery.dayId,
        deliveryId: delivery.id,
        dedupeKey: `final_status_reminder:${delivery.id}`,
        vars: {
          date: dayDate,
        },
        data: {
          dayId: delivery.dayId,
          cityId: delivery.cityId,
          deliveryId: delivery.id,
          date: dayDate,
          templateKey: 'final_status_reminder',
        },
      });

      this.tallyStatus(result, status);
    }
  }

  private tallyStatus(
    result: JobCounters,
    status: 'sent' | 'failed' | 'skipped'
  ): void {
    if (status === 'skipped') {
      result.skipped += 1;
    } else if (status === 'sent') {
      result.sent += 1;
    } else {
      result.failed += 1;
    }
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
