import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { AbilityFactory } from '../abilities/ability.factory';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CITY_A_ID,
  CITY_B_ID,
  COORDINATOR_A_ID,
  coordinatorA,
  coordinatorB,
  pendingVolunteer,
  superAdmin,
  volunteerA,
} from '../test/fake-users';
import { CitiesService } from './cities.service';

describe('CitiesService', () => {
  let service: CitiesService;

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
    extra: { mapZoom: 14 },
  };

  const mockPrisma = {
    city: { findUnique: vi.fn() },
    citySettings: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    cityInvite: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    cityMembership: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  const mockAuthService = {
    revokeAllUserSessions: vi.fn(),
  };

  beforeEach(async () => {
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
        callback(mockPrisma)
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CitiesService,
        AbilityFactory,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    service = module.get(CitiesService);
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
        callback(mockPrisma)
    );
  });

  describe('getSettings', () => {
    it('returns settings for a city coordinator', async () => {
      mockPrisma.city.findUnique.mockResolvedValue(city);
      mockPrisma.citySettings.findUnique.mockResolvedValue(settingsRow);

      const result = await service.getSettings(CITY_A_ID, coordinatorA());

      expect(result.centerAddress).toBe('10 Warehouse Rd, Holon');
      expect(result.defaultStartTime).toBe('09:00:00');
      expect(result.centerLat).toBe(32.0114);
    });

    it('returns settings for a super admin', async () => {
      mockPrisma.city.findUnique.mockResolvedValue(city);
      mockPrisma.citySettings.findUnique.mockResolvedValue(settingsRow);

      const result = await service.getSettings(CITY_A_ID, superAdmin());
      expect(result.cityId).toBe(CITY_A_ID);
    });

    it('hides another city from a coordinator', async () => {
      await expect(
        service.getSettings(CITY_A_ID, coordinatorB())
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockPrisma.citySettings.findUnique).not.toHaveBeenCalled();
    });

    it('hides settings from a volunteer', async () => {
      await expect(
        service.getSettings(CITY_A_ID, volunteerA())
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('hides settings from a pending member', async () => {
      await expect(
        service.getSettings(CITY_A_ID, pendingVolunteer())
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateSettings', () => {
    it('updates distribution hours for a coordinator', async () => {
      mockPrisma.city.findUnique.mockResolvedValue(city);
      mockPrisma.citySettings.findUnique.mockResolvedValue(settingsRow);
      mockPrisma.citySettings.update.mockResolvedValue({
        ...settingsRow,
        defaultStartTime: new Date(Date.UTC(1970, 0, 1, 8, 30, 0)),
      });

      const result = await service.updateSettings(
        CITY_A_ID,
        { defaultStartTime: '08:30' },
        coordinatorA()
      );

      expect(result.defaultStartTime).toBe('08:30:00');
      expect(mockPrisma.citySettings.update).toHaveBeenCalled();
    });

    it('rejects an inverted time range', async () => {
      mockPrisma.city.findUnique.mockResolvedValue(city);
      mockPrisma.citySettings.findUnique.mockResolvedValue(settingsRow);

      await expect(
        service.updateSettings(
          CITY_A_ID,
          { defaultStartTime: '16:00', defaultEndTime: '09:00' },
          coordinatorA()
        )
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('forbids a volunteer from updating settings', async () => {
      await expect(
        service.updateSettings(
          CITY_A_ID,
          { defaultStartTime: '08:30' },
          volunteerA()
        )
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('join links', () => {
    const invite = {
      id: 'invite-1',
      cityId: CITY_A_ID,
      role: 'volunteer' as const,
      tokenHash: 'fake-join-token',
      createdById: COORDINATOR_A_ID,
      expiresAt: null,
      maxUses: null,
      usedCount: 2,
      revokedAt: null,
      createdAt: new Date('2026-10-01T09:00:00.000Z'),
      updatedAt: new Date('2026-10-01T09:00:00.000Z'),
    };

    it('returns the current permanent links', async () => {
      mockPrisma.city.findUnique.mockResolvedValue(city);
      mockPrisma.cityInvite.findMany.mockResolvedValue([invite]);

      const result = await service.listJoinLinks(CITY_A_ID, coordinatorA());

      expect(result.links).toHaveLength(1);
      expect(result.links[0]?.token).toBe('fake-join-token');
      expect(result.links[0]?.url).toContain('/join/fake-join-token');
      expect(result.links[0]?.usedCount).toBe(2);
    });

    it('revokes the current link and creates a new one', async () => {
      mockPrisma.city.findUnique.mockResolvedValue(city);
      mockPrisma.cityInvite.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.cityInvite.create.mockResolvedValue({
        ...invite,
        tokenHash: 'new-fake-token',
        usedCount: 0,
      });

      const result = await service.regenerateJoinLink(
        CITY_A_ID,
        'volunteer',
        coordinatorA()
      );

      expect(mockPrisma.cityInvite.updateMany).toHaveBeenCalledWith({
        where: { cityId: CITY_A_ID, role: 'volunteer', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(result.token).toBe('new-fake-token');
      expect(result.url).toContain('/join/new-fake-token');
    });

    it('forbids volunteers from reading or rotating links', async () => {
      await expect(
        service.listJoinLinks(CITY_A_ID, volunteerA())
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        service.regenerateJoinLink(CITY_A_ID, 'volunteer', volunteerA())
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('forbids a coordinator from rotating another city link', async () => {
      await expect(
        service.regenerateJoinLink(CITY_B_ID, 'volunteer', coordinatorA())
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('coordinators', () => {
    const otherUser = {
      id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      firstName: 'Avi',
      lastName: 'Mizrahi',
      email: 'avi.mizrahi@example.com',
      phone: '+972505555555',
      archivedAt: null,
    };

    it('lists coordinators for the city', async () => {
      mockPrisma.city.findUnique.mockResolvedValue(city);
      mockPrisma.cityMembership.findMany.mockResolvedValue([
        {
          id: '99999999-9999-4999-8999-999999999999',
          cityId: CITY_A_ID,
          userId: COORDINATOR_A_ID,
          role: 'coordinator',
          status: 'active',
          createdAt: new Date('2026-10-01T09:00:00.000Z'),
          approvedAt: new Date('2026-10-01T09:00:00.000Z'),
          user: {
            id: COORDINATOR_A_ID,
            firstName: 'Noa',
            lastName: 'Levi',
            email: 'noa.levi@example.com',
            phone: '+972501111111',
            archivedAt: null,
          },
        },
      ]);

      const result = await service.listCoordinators(CITY_A_ID, coordinatorA());
      expect(result.coordinators).toHaveLength(1);
      expect(result.coordinators[0]?.membershipId).toBe(
        '99999999-9999-4999-8999-999999999999'
      );
      expect(result.coordinators[0]?.firstName).toBe('Noa');
    });

    it('adds a coordinator by email', async () => {
      mockPrisma.city.findUnique.mockResolvedValue(city);
      mockPrisma.user.findFirst.mockResolvedValue(otherUser);
      mockPrisma.cityMembership.findUnique.mockResolvedValue(null);
      mockPrisma.cityMembership.create.mockResolvedValue({
        id: 'membership-new',
        cityId: CITY_A_ID,
        userId: otherUser.id,
        role: 'coordinator',
        status: 'active',
        createdAt: new Date('2026-10-01T09:00:00.000Z'),
        approvedAt: new Date('2026-10-01T09:00:00.000Z'),
        user: otherUser,
      });

      const result = await service.addCoordinator(
        CITY_A_ID,
        { email: 'avi.mizrahi@example.com' },
        coordinatorA()
      );

      expect(result.userId).toBe(otherUser.id);
      expect(result.status).toBe('active');
    });

    it('lets a super admin add a coordinator to any city', async () => {
      mockPrisma.city.findUnique.mockResolvedValue(city);
      mockPrisma.user.findUnique.mockResolvedValue(otherUser);
      mockPrisma.cityMembership.findUnique.mockResolvedValue(null);
      mockPrisma.cityMembership.create.mockResolvedValue({
        id: 'membership-new',
        cityId: CITY_A_ID,
        userId: otherUser.id,
        role: 'coordinator',
        status: 'active',
        createdAt: new Date('2026-10-01T09:00:00.000Z'),
        approvedAt: new Date('2026-10-01T09:00:00.000Z'),
        user: otherUser,
      });

      const result = await service.addCoordinator(
        CITY_A_ID,
        { userId: otherUser.id },
        superAdmin()
      );
      expect(result.userId).toBe(otherUser.id);
    });

    it('rejects adding someone who is already an active coordinator', async () => {
      mockPrisma.city.findUnique.mockResolvedValue(city);
      mockPrisma.user.findUnique.mockResolvedValue(otherUser);
      mockPrisma.cityMembership.findUnique.mockResolvedValue({
        id: 'membership-existing',
        role: 'coordinator',
        status: 'active',
        user: otherUser,
      });

      await expect(
        service.addCoordinator(
          CITY_A_ID,
          { userId: otherUser.id },
          coordinatorA()
        )
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('refuses to remove the last active coordinator', async () => {
      mockPrisma.city.findUnique.mockResolvedValue(city);
      mockPrisma.cityMembership.findUnique.mockResolvedValue({
        id: 'membership-coord-a',
        role: 'coordinator',
        status: 'active',
      });
      mockPrisma.cityMembership.count.mockResolvedValue(1);

      await expect(
        service.removeCoordinator(CITY_A_ID, COORDINATOR_A_ID, coordinatorA())
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockAuthService.revokeAllUserSessions).not.toHaveBeenCalled();
    });

    it('removes another coordinator and revokes their sessions', async () => {
      mockPrisma.city.findUnique.mockResolvedValue(city);
      mockPrisma.cityMembership.findUnique.mockResolvedValue({
        id: 'membership-other',
        role: 'coordinator',
        status: 'active',
      });
      mockPrisma.cityMembership.count.mockResolvedValue(2);
      mockPrisma.cityMembership.update.mockResolvedValue({});
      mockAuthService.revokeAllUserSessions.mockResolvedValue(undefined);

      await service.removeCoordinator(CITY_A_ID, otherUser.id, coordinatorA());

      expect(mockPrisma.cityMembership.update).toHaveBeenCalledWith({
        where: { id: 'membership-other' },
        data: { status: 'removed' },
      });
      expect(mockAuthService.revokeAllUserSessions).toHaveBeenCalledWith(
        otherUser.id
      );
    });

    it('forbids a volunteer from listing or adding coordinators', async () => {
      await expect(
        service.listCoordinators(CITY_A_ID, volunteerA())
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        service.addCoordinator(
          CITY_A_ID,
          { userId: otherUser.id },
          volunteerA()
        )
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('forbids a coordinator from adding coordinators to another city', async () => {
      await expect(
        service.addCoordinator(
          CITY_B_ID,
          { userId: otherUser.id },
          coordinatorA()
        )
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
