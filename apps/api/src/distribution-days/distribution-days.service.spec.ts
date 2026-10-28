import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { AbilityFactory } from '../abilities/ability.factory';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CITY_A_ID,
  CITY_B_ID,
  COORDINATOR_A_ID,
  coordinatorA,
  coordinatorB,
  superAdmin,
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

  const mockPrisma = {
    city: { findUnique: vi.fn() },
    citySettings: { findUnique: vi.fn() },
    distributionDay: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  };

  const mockNotifications = {
    announceDistributionDay: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPrisma.city.findUnique.mockResolvedValue(city);
    mockPrisma.citySettings.findUnique.mockResolvedValue(settingsRow);
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
