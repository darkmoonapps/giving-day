import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { AbilityFactory } from '../abilities/ability.factory';
import { DeliveriesService } from '../deliveries/deliveries.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CITY_A_ID,
  CITY_B_ID,
  COORDINATOR_A_ID,
  coordinatorA,
  coordinatorB,
  superAdmin,
  VOLUNTEER_A_ID,
  volunteerA,
} from '../test/fake-users';
import { DistributionDaysService } from './distribution-days.service';

describe('DistributionDaysService', () => {
  let service: DistributionDaysService;

  const city = {
    id: CITY_A_ID,
    archivedAt: null,
    slug: 'holon',
    nameHe: 'חולון',
    nameEn: 'Holon',
  };

  const settingsRow = {
    id: 'settings-1',
    cityId: CITY_A_ID,
    createdAt: new Date('2026-10-01T09:00:00.000Z'),
    updatedAt: new Date('2026-10-01T09:00:00.000Z'),
    centerAddress: '10 Warehouse Rd, Holon',
    centerLat: new Prisma.Decimal('32.011400'),
    centerLng: new Prisma.Decimal('34.774800'),
    defaultStartTime: new Date(Date.UTC(1970, 0, 1, 9, 0, 0)),
    defaultEndTime: new Date(Date.UTC(1970, 0, 1, 14, 0, 0)),
    confirmReminderAfterHours: 24,
    unpickedPushMinutesBeforeEnd: 60,
    missingFinalStatusWaitHours: 72,
    defaultLocale: 'he' as const,
    defaultTheme: 'wisteria-mint',
    orgName: 'Latet Holon',
    logoUrl: null,
    extra: {},
  };

  const publishedDay = {
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
    status: 'published' as const,
    publishedAt: new Date('2026-10-28T09:00:00.000Z'),
    closedAt: null,
    createdById: COORDINATOR_A_ID,
  };

  const closedDay = {
    ...publishedDay,
    id: '55555555-5555-4555-8555-555555555555',
    date: new Date('2026-10-15T00:00:00.000Z'),
    status: 'closed' as const,
    closedAt: new Date('2026-10-15T16:00:00.000Z'),
  };

  const confirmedParticipation = {
    id: '44444444-4444-4444-8444-444444444444',
    createdAt: new Date('2026-10-29T10:00:00.000Z'),
    updatedAt: new Date('2026-10-29T10:00:00.000Z'),
    cityId: CITY_A_ID,
    dayId: publishedDay.id,
    volunteerId: VOLUNTEER_A_ID,
    status: 'confirmed' as const,
    respondedAt: new Date('2026-10-29T10:00:00.000Z'),
    cancelReason: null,
    finishedAt: null,
  };

  const mockPrisma = {
    city: { findUnique: vi.fn() },
    citySettings: { findUnique: vi.fn() },
    distributionDay: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    dayParticipation: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    cityMembership: {
      findMany: vi.fn(),
    },
    delivery: {
      updateMany: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
    match: {
      findMany: vi.fn(),
    },
    deliveryEvent: {
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  const mockNotifications = {
    announceDistributionDay: vi.fn(),
  };

  const mockDeliveries = {
    prefillFromPermanentMatches: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPrisma.city.findUnique.mockResolvedValue(city);
    mockPrisma.citySettings.findUnique.mockResolvedValue(settingsRow);
    mockPrisma.dayParticipation.findMany.mockResolvedValue([]);
    mockPrisma.dayParticipation.findUnique.mockResolvedValue(null);
    mockPrisma.cityMembership.findMany.mockResolvedValue([]);
    mockPrisma.delivery.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.delivery.createMany.mockResolvedValue({ count: 0 });
    mockPrisma.delivery.findMany.mockResolvedValue([]);
    mockPrisma.match.findMany.mockResolvedValue([]);
    mockPrisma.deliveryEvent.createMany.mockResolvedValue({ count: 0 });
    mockDeliveries.prefillFromPermanentMatches.mockResolvedValue(0);
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
        callback(mockPrisma)
    );
    mockNotifications.announceDistributionDay.mockResolvedValue({
      attempted: 1,
      sent: 1,
      failed: 0,
      skipped: 0,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DistributionDaysService,
        AbilityFactory,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: DeliveriesService, useValue: mockDeliveries },
      ],
    }).compile();

    service = module.get(DistributionDaysService);
  });

  describe('open', () => {
    it('publishes a day using city-settings hours and announces it', async () => {
      mockPrisma.distributionDay.create.mockResolvedValue(publishedDay);

      const result = await service.open(
        CITY_A_ID,
        { date: '2026-11-15', notesForVolunteers: 'Bring a folding cart' },
        coordinatorA()
      );

      expect(result.status).toBe('published');
      expect(result.startTime).toBe('09:00:00');
      expect(result.endTime).toBe('14:00:00');
      expect(result.internalNotes).toBe('Need extra rice bags');
      expect(mockPrisma.distributionDay.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cityId: CITY_A_ID,
          status: 'published',
          createdById: COORDINATOR_A_ID,
        }),
      });
      expect(mockNotifications.announceDistributionDay).toHaveBeenCalledWith(
        publishedDay
      );
      expect(mockDeliveries.prefillFromPermanentMatches).toHaveBeenCalledWith(
        mockPrisma,
        {
          cityId: CITY_A_ID,
          dayId: publishedDay.id,
          actorId: COORDINATOR_A_ID,
        }
      );
    });

    it('allows a super admin to open a day for any city', async () => {
      mockPrisma.distributionDay.create.mockResolvedValue({
        ...publishedDay,
        createdById: superAdmin().id,
      });

      const result = await service.open(
        CITY_A_ID,
        { date: '2026-11-15' },
        superAdmin()
      );

      expect(result.status).toBe('published');
    });

    it('hides another city from a coordinator', async () => {
      await expect(
        service.open(CITY_A_ID, { date: '2026-11-15' }, coordinatorB())
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockPrisma.distributionDay.create).not.toHaveBeenCalled();
    });

    it('forbids a volunteer from opening a day', async () => {
      await expect(
        service.open(CITY_A_ID, { date: '2026-11-15' }, volunteerA())
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a duplicate city date', async () => {
      mockPrisma.distributionDay.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: 'P2002',
          clientVersion: '6.1.0',
        })
      );

      await expect(
        service.open(CITY_A_ID, { date: '2026-11-15' }, coordinatorA())
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects a missing city settings row', async () => {
      mockPrisma.citySettings.findUnique.mockResolvedValue(null);

      await expect(
        service.open(CITY_A_ID, { date: '2026-11-15' }, coordinatorA())
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('list and get', () => {
    it('returns all days including internal notes to a coordinator', async () => {
      mockPrisma.distributionDay.findMany.mockResolvedValue([
        publishedDay,
        closedDay,
      ]);

      const result = await service.list(CITY_A_ID, coordinatorA());

      expect(result.days).toHaveLength(2);
      expect(result.days[0]).toMatchObject({
        internalNotes: 'Need extra rice bags',
        createdById: COORDINATOR_A_ID,
      });
    });

    it('returns only open days without internal notes to a volunteer', async () => {
      mockPrisma.distributionDay.findMany.mockResolvedValue([publishedDay]);

      const result = await service.list(CITY_A_ID, volunteerA());

      expect(mockPrisma.distributionDay.findMany).toHaveBeenCalledWith({
        where: {
          cityId: CITY_A_ID,
          status: { in: ['published', 'in_progress'] },
        },
        orderBy: { date: 'desc' },
      });
      expect(result.days).toHaveLength(1);
      expect(result.days[0]).not.toHaveProperty('internalNotes');
      expect(result.days[0]).not.toHaveProperty('createdById');
    });

    it('hides a closed day from a volunteer', async () => {
      mockPrisma.distributionDay.findFirst.mockResolvedValue(closedDay);

      await expect(
        service.get(CITY_A_ID, closedDay.id, volunteerA())
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lets a volunteer read an open day Flow 2 payload', async () => {
      mockPrisma.distributionDay.findFirst.mockResolvedValue(publishedDay);

      const result = await service.get(
        CITY_A_ID,
        publishedDay.id,
        volunteerA()
      );

      expect(result.date).toBe('2026-11-15');
      expect(result.notesForVolunteers).toBe('Bring a folding cart');
      expect(result).not.toHaveProperty('internalNotes');
      expect(result).toMatchObject({ myParticipation: null });
    });

    it('includes the volunteer own response on an open day', async () => {
      mockPrisma.distributionDay.findFirst.mockResolvedValue(publishedDay);
      mockPrisma.dayParticipation.findUnique.mockResolvedValue(
        confirmedParticipation
      );

      const result = await service.get(
        CITY_A_ID,
        publishedDay.id,
        volunteerA()
      );

      expect(result.myParticipation).toMatchObject({
        volunteerId: VOLUNTEER_A_ID,
        status: 'confirmed',
      });
    });
  });

  describe('respond', () => {
    it('lets a volunteer confirm an open day', async () => {
      mockPrisma.distributionDay.findFirst.mockResolvedValue(publishedDay);
      mockPrisma.dayParticipation.upsert.mockResolvedValue(
        confirmedParticipation
      );

      const result = await service.respond(
        CITY_A_ID,
        publishedDay.id,
        { status: 'confirmed' },
        volunteerA()
      );

      expect(result.status).toBe('confirmed');
      expect(result.cancelReason).toBeNull();
      expect(mockPrisma.dayParticipation.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            volunteerId: VOLUNTEER_A_ID,
            status: 'confirmed',
            cancelReason: null,
          }),
        })
      );
      expect(mockPrisma.delivery.updateMany).not.toHaveBeenCalled();
    });

    it('requires a reason and unassigns deliveries when declining', async () => {
      mockPrisma.distributionDay.findFirst.mockResolvedValue(publishedDay);
      mockPrisma.dayParticipation.upsert.mockResolvedValue({
        ...confirmedParticipation,
        status: 'declined',
        cancelReason: 'Family event in Holon',
      });

      const result = await service.respond(
        CITY_A_ID,
        publishedDay.id,
        { status: 'declined', cancelReason: 'Family event in Holon' },
        volunteerA()
      );

      expect(result.status).toBe('declined');
      expect(result.cancelReason).toBe('Family event in Holon');
      expect(mockPrisma.delivery.updateMany).toHaveBeenCalledWith({
        where: {
          cityId: CITY_A_ID,
          dayId: publishedDay.id,
          volunteerId: VOLUNTEER_A_ID,
          status: { in: ['assigned', 'picked'] },
        },
        data: {
          volunteerId: null,
          status: 'unassigned',
          assignedAt: null,
        },
      });
    });

    it('rejects a missing decline reason', async () => {
      mockPrisma.distributionDay.findFirst.mockResolvedValue(publishedDay);

      await expect(
        service.respond(
          CITY_A_ID,
          publishedDay.id,
          { status: 'declined' },
          volunteerA()
        )
      ).rejects.toThrow();
      expect(mockPrisma.dayParticipation.upsert).not.toHaveBeenCalled();
    });

    it('rejects responding to a closed day', async () => {
      mockPrisma.distributionDay.findFirst.mockResolvedValue(closedDay);

      await expect(
        service.respond(
          CITY_A_ID,
          closedDay.id,
          { status: 'confirmed' },
          volunteerA()
        )
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('hides respond from a coordinator at the city-scoped check', async () => {
      await expect(
        service.respond(
          CITY_A_ID,
          publishedDay.id,
          { status: 'confirmed' },
          coordinatorA()
        )
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('forbids a super admin who is not a volunteer in the city', async () => {
      await expect(
        service.respond(
          CITY_A_ID,
          publishedDay.id,
          { status: 'confirmed' },
          superAdmin()
        )
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('hides another city from a volunteer', async () => {
      await expect(
        service.respond(
          CITY_B_ID,
          publishedDay.id,
          { status: 'confirmed' },
          volunteerA()
        )
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('listParticipations', () => {
    it('returns confirmed, declined with reason, and no-response rows', async () => {
      mockPrisma.distributionDay.findFirst.mockResolvedValue(publishedDay);
      mockPrisma.cityMembership.findMany.mockResolvedValue([
        {
          userId: VOLUNTEER_A_ID,
          user: {
            id: VOLUNTEER_A_ID,
            firstName: 'Yonatan',
            lastName: 'Bar',
          },
        },
        {
          userId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
          user: {
            id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
            firstName: 'Maya',
            lastName: 'Cohen',
          },
        },
        {
          userId: '99999999-9999-4999-8999-999999999999',
          user: {
            id: '99999999-9999-4999-8999-999999999999',
            firstName: 'Dana',
            lastName: 'Levi',
          },
        },
      ]);
      mockPrisma.dayParticipation.findMany.mockResolvedValue([
        confirmedParticipation,
        {
          ...confirmedParticipation,
          id: '66666666-6666-4666-8666-666666666666',
          volunteerId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
          status: 'declined',
          cancelReason: 'Out of town',
          respondedAt: new Date('2026-10-29T11:00:00.000Z'),
        },
      ]);

      const result = await service.listParticipations(
        CITY_A_ID,
        publishedDay.id,
        coordinatorA()
      );

      expect(result.responses).toEqual([
        {
          volunteerId: VOLUNTEER_A_ID,
          firstName: 'Yonatan',
          lastName: 'Bar',
          responseStatus: 'confirmed',
          cancelReason: null,
          respondedAt: '2026-10-29T10:00:00.000Z',
        },
        {
          volunteerId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
          firstName: 'Maya',
          lastName: 'Cohen',
          responseStatus: 'declined',
          cancelReason: 'Out of town',
          respondedAt: '2026-10-29T11:00:00.000Z',
        },
        {
          volunteerId: '99999999-9999-4999-8999-999999999999',
          firstName: 'Dana',
          lastName: 'Levi',
          responseStatus: 'no_response',
          cancelReason: null,
          respondedAt: null,
        },
      ]);
    });

    it('hides another city from a coordinator', async () => {
      await expect(
        service.listParticipations(CITY_A_ID, publishedDay.id, coordinatorB())
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('hides the coordinator list from a volunteer', async () => {
      await expect(
        service.listParticipations(CITY_A_ID, publishedDay.id, volunteerA())
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('close', () => {
    it('closes a published day', async () => {
      mockPrisma.distributionDay.findFirst.mockResolvedValue(publishedDay);
      mockPrisma.distributionDay.update.mockResolvedValue({
        ...publishedDay,
        status: 'closed',
        closedAt: new Date('2026-11-15T16:00:00.000Z'),
      });

      const result = await service.close(
        CITY_A_ID,
        publishedDay.id,
        coordinatorA()
      );

      expect(result.status).toBe('closed');
      expect(result.closedAt).toBe('2026-11-15T16:00:00.000Z');
    });

    it('rejects closing an already closed day', async () => {
      mockPrisma.distributionDay.findFirst.mockResolvedValue(closedDay);

      await expect(
        service.close(CITY_A_ID, closedDay.id, coordinatorA())
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('hides another city from a coordinator', async () => {
      await expect(
        service.close(CITY_B_ID, publishedDay.id, coordinatorA())
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
