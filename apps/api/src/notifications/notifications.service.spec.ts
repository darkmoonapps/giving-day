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
    notificationLog: { findUnique: vi.fn(), create: vi.fn() },
    pushSubscription: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    messageTemplate: { findMany: vi.fn() },
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
});
