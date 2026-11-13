import { Test, TestingModule } from '@nestjs/testing';
import type { DistributionDay } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CITY_A_ID, VOLUNTEER_A_ID } from '../test/fake-users';
import { NotificationsService } from './notifications.service';
import {
  NOTIFICATION_PROVIDER,
  type NotificationProvider,
} from './notification.provider';

describe('NotificationsService', () => {
  let service: NotificationsService;
  const provider: NotificationProvider = {
    send: vi.fn().mockResolvedValue({ ok: true }),
  };

  const day: DistributionDay = {
    id: '33333333-3333-4333-8333-333333333333',
    createdAt: new Date('2026-10-28T09:00:00.000Z'),
    updatedAt: new Date('2026-10-28T09:00:00.000Z'),
    cityId: CITY_A_ID,
    date: new Date('2026-11-15T00:00:00.000Z'),
    startTime: new Date(Date.UTC(1970, 0, 1, 9, 0, 0)),
    endTime: new Date(Date.UTC(1970, 0, 1, 14, 0, 0)),
    notesForVolunteers: 'Bring a folding cart',
    internalNotes: 'Need extra rice bags',
    addOns: ['holiday honey'],
    status: 'published',
    publishedAt: new Date('2026-10-28T09:00:00.000Z'),
    closedAt: null,
    createdById: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  };

  const mockPrisma = {
    cityMembership: { findMany: vi.fn() },
    dayParticipation: { findMany: vi.fn() },
    delivery: { findMany: vi.fn() },
    distributionDay: { findMany: vi.fn() },
    notificationLog: { findUnique: vi.fn(), create: vi.fn() },
    pushSubscription: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    messageTemplate: { findMany: vi.fn() },
  };

  const pushSub = {
    id: 'sub-1',
    userId: VOLUNTEER_A_ID,
    endpoint: 'https://push.example.com/fake-subscription',
    p256dh: 'fake-p256dh-key',
    auth: 'fake-auth-secret',
    userAgent: 'Mozilla/5.0 GivingDayTest',
    lastSuccessAt: null,
    failedCount: 0,
    disabledAt: null,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPrisma.messageTemplate.findMany.mockResolvedValue([]);
    mockPrisma.notificationLog.findUnique.mockResolvedValue(null);
    mockPrisma.notificationLog.create.mockResolvedValue({});
    mockPrisma.pushSubscription.update.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NOTIFICATION_PROVIDER, useValue: provider },
      ],
    }).compile();

    service = module.get(NotificationsService);
  });

  it('fans out a day invite to active volunteers and records a sent log', async () => {
    mockPrisma.cityMembership.findMany.mockResolvedValue([
      {
        userId: VOLUNTEER_A_ID,
        user: { id: VOLUNTEER_A_ID, locale: 'en' },
      },
    ]);
    mockPrisma.pushSubscription.findMany.mockResolvedValue([
      {
        id: 'sub-1',
        userId: VOLUNTEER_A_ID,
        endpoint: 'https://push.example.com/fake-subscription',
        p256dh: 'fake-p256dh-key',
        auth: 'fake-auth-secret',
        userAgent: 'Mozilla/5.0 GivingDayTest',
        lastSuccessAt: null,
        failedCount: 0,
        disabledAt: null,
      },
    ]);

    const result = await service.announceDistributionDay(day);

    expect(result).toEqual({
      attempted: 1,
      sent: 1,
      failed: 0,
      skipped: 0,
    });
    expect(provider.send).toHaveBeenCalledOnce();
    expect(mockPrisma.notificationLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: VOLUNTEER_A_ID,
        templateKey: 'day_invite',
        status: 'sent',
        dedupeKey: `day_invite:${day.id}:${VOLUNTEER_A_ID}`,
      }),
    });
  });

  it('skips volunteers who already received the invite', async () => {
    mockPrisma.cityMembership.findMany.mockResolvedValue([
      {
        userId: VOLUNTEER_A_ID,
        user: { id: VOLUNTEER_A_ID, locale: 'he' },
      },
    ]);
    mockPrisma.notificationLog.findUnique.mockResolvedValue({
      id: 'log-1',
    });

    const result = await service.announceDistributionDay(day);

    expect(result.skipped).toBe(1);
    expect(provider.send).not.toHaveBeenCalled();
  });

  it('logs a failure when the volunteer has no push subscription', async () => {
    mockPrisma.cityMembership.findMany.mockResolvedValue([
      {
        userId: VOLUNTEER_A_ID,
        user: { id: VOLUNTEER_A_ID, locale: 'he' },
      },
    ]);
    mockPrisma.pushSubscription.findMany.mockResolvedValue([]);

    const result = await service.announceDistributionDay(day);

    expect(result.failed).toBe(1);
    expect(mockPrisma.notificationLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'failed',
        error: 'notifications.no_subscription',
      }),
    });
  });

  it('disables a subscription when the provider reports it is gone', async () => {
    vi.mocked(provider.send).mockResolvedValueOnce({
      ok: false,
      gone: true,
      error: 'Gone',
    });
    mockPrisma.cityMembership.findMany.mockResolvedValue([
      {
        userId: VOLUNTEER_A_ID,
        user: { id: VOLUNTEER_A_ID, locale: 'en' },
      },
    ]);
    mockPrisma.pushSubscription.findMany.mockResolvedValue([
      {
        id: 'sub-1',
        userId: VOLUNTEER_A_ID,
        endpoint: 'https://push.example.com/stale',
        p256dh: 'fake-p256dh-key',
        auth: 'fake-auth-secret',
        userAgent: 'Mozilla/5.0 GivingDayTest',
        lastSuccessAt: null,
        failedCount: 1,
        disabledAt: null,
      },
    ]);

    await service.announceDistributionDay(day);

    expect(mockPrisma.pushSubscription.update).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: expect.objectContaining({
        failedCount: { increment: 1 },
      }),
    });
    const updateData = mockPrisma.pushSubscription.update.mock.calls[0][0]
      .data as { disabledAt?: Date };
    expect(updateData.disabledAt).toBeInstanceOf(Date);
  });

  it('sends confirm reminders only to non-responders after the city offset', async () => {
    const VOLUNTEER_B_ID = '99999999-9999-4999-8999-999999999999';
    mockPrisma.distributionDay.findMany.mockResolvedValue([
      {
        ...day,
        publishedAt: new Date('2026-10-28T09:00:00.000Z'),
        city: {
          id: CITY_A_ID,
          settings: { confirmReminderAfterHours: 24 },
        },
      },
    ]);
    mockPrisma.cityMembership.findMany.mockResolvedValue([
      {
        userId: VOLUNTEER_A_ID,
        user: { id: VOLUNTEER_A_ID, locale: 'he' },
      },
      {
        userId: VOLUNTEER_B_ID,
        user: { id: VOLUNTEER_B_ID, locale: 'en' },
      },
    ]);
    mockPrisma.dayParticipation.findMany.mockResolvedValue([
      { volunteerId: VOLUNTEER_B_ID },
    ]);
    mockPrisma.pushSubscription.findMany.mockResolvedValue([
      {
        id: 'sub-1',
        userId: VOLUNTEER_A_ID,
        endpoint: 'https://push.example.com/fake-subscription',
        p256dh: 'fake-p256dh-key',
        auth: 'fake-auth-secret',
        userAgent: 'Mozilla/5.0 GivingDayTest',
        lastSuccessAt: null,
        failedCount: 0,
        disabledAt: null,
      },
    ]);

    const result = await service.sendConfirmReminders(
      new Date('2026-10-29T10:00:00.000Z')
    );

    expect(result).toEqual({
      attempted: 1,
      sent: 1,
      failed: 0,
      skipped: 0,
      daysProcessed: 1,
    });
    expect(provider.send).toHaveBeenCalledOnce();
    expect(mockPrisma.notificationLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: VOLUNTEER_A_ID,
        templateKey: 'confirm_reminder',
        status: 'sent',
        dedupeKey: `confirm_reminder:${day.id}:${VOLUNTEER_A_ID}`,
      }),
    });
  });

  it('skips open days until confirmReminderAfterHours have elapsed', async () => {
    mockPrisma.distributionDay.findMany.mockResolvedValue([
      {
        ...day,
        publishedAt: new Date('2026-10-28T09:00:00.000Z'),
        city: {
          id: CITY_A_ID,
          settings: { confirmReminderAfterHours: 24 },
        },
      },
    ]);

    const result = await service.sendConfirmReminders(
      new Date('2026-10-28T12:00:00.000Z')
    );

    expect(result).toEqual({
      attempted: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      daysProcessed: 0,
    });
    expect(mockPrisma.cityMembership.findMany).not.toHaveBeenCalled();
    expect(provider.send).not.toHaveBeenCalled();
  });

  it('is idempotent when a confirm reminder was already logged', async () => {
    mockPrisma.distributionDay.findMany.mockResolvedValue([
      {
        ...day,
        publishedAt: new Date('2026-10-28T09:00:00.000Z'),
        city: {
          id: CITY_A_ID,
          settings: { confirmReminderAfterHours: 24 },
        },
      },
    ]);
    mockPrisma.cityMembership.findMany.mockResolvedValue([
      {
        userId: VOLUNTEER_A_ID,
        user: { id: VOLUNTEER_A_ID, locale: 'en' },
      },
    ]);
    mockPrisma.dayParticipation.findMany.mockResolvedValue([]);
    mockPrisma.notificationLog.findUnique.mockResolvedValue({ id: 'log-1' });

    const result = await service.sendConfirmReminders(
      new Date('2026-10-29T10:00:00.000Z')
    );

    expect(result.skipped).toBe(1);
    expect(result.daysProcessed).toBe(1);
    expect(provider.send).not.toHaveBeenCalled();
  });

  it('skips past-dated published days and still processes today-dated ones', async () => {
    const pastDayId = '44444444-4444-4444-8444-444444444444';
    const todayDayId = '55555555-5555-4555-8555-555555555555';
    const now = new Date('2026-11-15T10:00:00.000Z');

    mockPrisma.distributionDay.findMany.mockResolvedValue([
      {
        ...day,
        id: pastDayId,
        date: new Date('2026-11-14T00:00:00.000Z'),
        publishedAt: new Date('2026-11-01T09:00:00.000Z'),
        city: {
          id: CITY_A_ID,
          settings: { confirmReminderAfterHours: 24 },
        },
      },
      {
        ...day,
        id: todayDayId,
        date: new Date('2026-11-15T00:00:00.000Z'),
        publishedAt: new Date('2026-11-01T09:00:00.000Z'),
        city: {
          id: CITY_A_ID,
          settings: { confirmReminderAfterHours: 24 },
        },
      },
    ]);
    mockPrisma.cityMembership.findMany.mockResolvedValue([
      {
        userId: VOLUNTEER_A_ID,
        user: { id: VOLUNTEER_A_ID, locale: 'he' },
      },
    ]);
    mockPrisma.dayParticipation.findMany.mockResolvedValue([]);
    mockPrisma.pushSubscription.findMany.mockResolvedValue([
      {
        id: 'sub-1',
        userId: VOLUNTEER_A_ID,
        endpoint: 'https://push.example.com/fake-subscription',
        p256dh: 'fake-p256dh-key',
        auth: 'fake-auth-secret',
        userAgent: 'Mozilla/5.0 GivingDayTest',
        lastSuccessAt: null,
        failedCount: 0,
        disabledAt: null,
      },
    ]);

    const result = await service.sendConfirmReminders(now);

    expect(mockPrisma.distributionDay.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          date: { gte: new Date('2026-11-15T00:00:00.000Z') },
        }),
      })
    );
    expect(result).toEqual({
      attempted: 1,
      sent: 1,
      failed: 0,
      skipped: 0,
      daysProcessed: 1,
    });
    expect(provider.send).toHaveBeenCalledOnce();
    expect(mockPrisma.notificationLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: VOLUNTEER_A_ID,
        templateKey: 'confirm_reminder',
        status: 'sent',
        dedupeKey: `confirm_reminder:${todayDayId}:${VOLUNTEER_A_ID}`,
      }),
    });
    expect(mockPrisma.notificationLog.create).not.toHaveBeenCalledWith({
      data: expect.objectContaining({
        dedupeKey: `confirm_reminder:${pastDayId}:${VOLUNTEER_A_ID}`,
      }),
    });
  });

  it('sends unpicked warnings near the Holon window end for assigned packages', async () => {
    // Holon end 14:00 Asia/Jerusalem (UTC+2 in Nov) => 12:00 UTC; 60 min before => 11:00 UTC.
    mockPrisma.distributionDay.findMany.mockResolvedValue([
      {
        ...day,
        date: new Date('2026-11-15T00:00:00.000Z'),
        endTime: new Date(Date.UTC(1970, 0, 1, 14, 0, 0)),
        city: {
          id: CITY_A_ID,
          timezone: 'Asia/Jerusalem',
          settings: { unpickedPushMinutesBeforeEnd: 60 },
        },
      },
    ]);
    mockPrisma.delivery.findMany
      .mockResolvedValueOnce([
        {
          volunteerId: VOLUNTEER_A_ID,
          volunteer: {
            id: VOLUNTEER_A_ID,
            locale: 'he',
            archivedAt: null,
          },
        },
        {
          volunteerId: VOLUNTEER_A_ID,
          volunteer: {
            id: VOLUNTEER_A_ID,
            locale: 'he',
            archivedAt: null,
          },
        },
      ])
      .mockResolvedValueOnce([]);
    mockPrisma.pushSubscription.findMany.mockResolvedValue([pushSub]);

    const result = await service.sendPickupStatusReminders(
      new Date('2026-11-15T11:05:00.000Z')
    );

    expect(result).toEqual({
      attempted: 1,
      sent: 1,
      failed: 0,
      skipped: 0,
      daysProcessed: 1,
    });
    expect(provider.send).toHaveBeenCalledOnce();
    expect(mockPrisma.notificationLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: VOLUNTEER_A_ID,
        templateKey: 'unpicked_warning',
        status: 'sent',
        dedupeKey: `unpicked_warning:${day.id}:${VOLUNTEER_A_ID}`,
      }),
    });
  });

  it('skips unpicked warnings until unpickedPushMinutesBeforeEnd', async () => {
    mockPrisma.distributionDay.findMany.mockResolvedValue([
      {
        ...day,
        date: new Date('2026-11-15T00:00:00.000Z'),
        endTime: new Date(Date.UTC(1970, 0, 1, 14, 0, 0)),
        city: {
          id: CITY_A_ID,
          timezone: 'Asia/Jerusalem',
          settings: { unpickedPushMinutesBeforeEnd: 60 },
        },
      },
    ]);
    mockPrisma.delivery.findMany.mockResolvedValue([]);

    const result = await service.sendPickupStatusReminders(
      new Date('2026-11-15T10:00:00.000Z')
    );

    expect(result.daysProcessed).toBe(0);
    expect(result.attempted).toBe(0);
    expect(provider.send).not.toHaveBeenCalled();
  });

  it('sends final-status reminders after missingFinalStatusWaitHours', async () => {
    const deliveryId = '66666666-6666-4666-8666-666666666666';
    mockPrisma.distributionDay.findMany.mockResolvedValue([]);
    mockPrisma.delivery.findMany.mockResolvedValue([
      {
        id: deliveryId,
        cityId: CITY_A_ID,
        dayId: day.id,
        volunteerId: VOLUNTEER_A_ID,
        pickedAt: new Date('2026-11-15T12:00:00.000Z'),
        volunteer: {
          id: VOLUNTEER_A_ID,
          locale: 'en',
          archivedAt: null,
        },
        day: {
          id: day.id,
          date: new Date('2026-11-15T00:00:00.000Z'),
          city: {
            settings: { missingFinalStatusWaitHours: 72 },
          },
        },
      },
    ]);
    mockPrisma.pushSubscription.findMany.mockResolvedValue([
      { ...pushSub, userId: VOLUNTEER_A_ID },
    ]);

    const result = await service.sendPickupStatusReminders(
      new Date('2026-11-18T13:00:00.000Z')
    );

    expect(result).toEqual({
      attempted: 1,
      sent: 1,
      failed: 0,
      skipped: 0,
      daysProcessed: 1,
    });
    expect(mockPrisma.notificationLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: VOLUNTEER_A_ID,
        templateKey: 'final_status_reminder',
        deliveryId,
        status: 'sent',
        dedupeKey: `final_status_reminder:${deliveryId}`,
      }),
    });
  });

  it('is idempotent when a final-status reminder was already logged', async () => {
    const deliveryId = '77777777-7777-4777-8777-777777777777';
    mockPrisma.distributionDay.findMany.mockResolvedValue([]);
    mockPrisma.delivery.findMany.mockResolvedValue([
      {
        id: deliveryId,
        cityId: CITY_A_ID,
        dayId: day.id,
        volunteerId: VOLUNTEER_A_ID,
        pickedAt: new Date('2026-11-15T12:00:00.000Z'),
        volunteer: {
          id: VOLUNTEER_A_ID,
          locale: 'he',
          archivedAt: null,
        },
        day: {
          id: day.id,
          date: new Date('2026-11-15T00:00:00.000Z'),
          city: {
            settings: { missingFinalStatusWaitHours: 72 },
          },
        },
      },
    ]);
    mockPrisma.notificationLog.findUnique.mockResolvedValue({ id: 'log-1' });

    const result = await service.sendPickupStatusReminders(
      new Date('2026-11-18T13:00:00.000Z')
    );

    expect(result.skipped).toBe(1);
    expect(result.daysProcessed).toBe(1);
    expect(provider.send).not.toHaveBeenCalled();
  });
});
