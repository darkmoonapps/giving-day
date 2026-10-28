import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AbilityFactory } from '../abilities/ability.factory';
import { PrismaService } from '../prisma/prisma.service';
import { volunteerA, VOLUNTEER_A_ID } from '../test/fake-users';
import { PushSubscriptionsService } from './push-subscriptions.service';

describe('PushSubscriptionsService', () => {
  let service: PushSubscriptionsService;

  const row = {
    id: '44444444-4444-4444-8444-444444444444',
    createdAt: new Date('2026-10-28T09:00:00.000Z'),
    updatedAt: new Date('2026-10-28T09:00:00.000Z'),
    userId: VOLUNTEER_A_ID,
    endpoint: 'https://push.example.com/fake-subscription',
    p256dh: 'fake-p256dh-key',
    auth: 'fake-auth-secret',
    userAgent: 'Mozilla/5.0 GivingDayTest',
    lastSuccessAt: null,
    failedCount: 0,
    disabledAt: null,
  };

  const mockPrisma = {
    pushSubscription: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushSubscriptionsService,
        AbilityFactory,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(PushSubscriptionsService);
  });

  it('reports VAPID as unconfigured when env keys are missing', () => {
    expect(service.getVapidPublicKey()).toEqual({
      publicKey: null,
      configured: false,
    });
  });

  it('upserts a subscription for the signed-in volunteer', async () => {
    mockPrisma.pushSubscription.findUnique.mockResolvedValue(null);
    mockPrisma.pushSubscription.create.mockResolvedValue(row);

    const result = await service.upsertMine(
      {
        endpoint: row.endpoint,
        p256dh: row.p256dh,
        auth: row.auth,
        userAgent: row.userAgent,
      },
      volunteerA()
    );

    expect(result.id).toBe(row.id);
    expect(result.endpoint).toBe(row.endpoint);
    expect((result as { p256dh?: string }).p256dh).toBeUndefined();
  });

  it('rejects an endpoint already stored for another user', async () => {
    mockPrisma.pushSubscription.findUnique.mockResolvedValue({
      ...row,
      userId: 'someone-else',
    });

    await expect(
      service.upsertMine(
        {
          endpoint: row.endpoint,
          p256dh: row.p256dh,
          auth: row.auth,
        },
        volunteerA()
      )
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not delete another user subscription', async () => {
    mockPrisma.pushSubscription.findUnique.mockResolvedValue({
      ...row,
      userId: 'someone-else',
    });

    await expect(
      service.deleteMine(row.id, volunteerA())
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mockPrisma.pushSubscription.delete).not.toHaveBeenCalled();
  });
});
