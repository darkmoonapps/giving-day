import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { AbilityFactory } from '../abilities/ability.factory';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  APPLICANT_ID,
  CITY_A_ID,
  CITY_B_ID,
  COORDINATOR_A_ID,
  coordinatorA,
  coordinatorB,
  notOnboardedUser,
  onboardedApplicant,
  pendingVolunteer,
  superAdmin,
  volunteerA,
} from '../test/fake-users';
import { CitiesService } from './cities.service';
import { hashJoinToken } from './join-token';

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
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    cityMembership: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
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

    it('rejects javascript: and http: logo URLs', async () => {
      mockPrisma.city.findUnique.mockResolvedValue(city);
      mockPrisma.citySettings.findUnique.mockResolvedValue(settingsRow);

      await expect(
        service.updateSettings(
          CITY_A_ID,
          { logoUrl: 'javascript:alert(1)' },
          coordinatorA()
        )
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.updateSettings(
          CITY_A_ID,
          { logoUrl: 'http://example.com/logo.svg' },
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
      tokenHash: hashJoinToken('fake-join-token'),
      createdById: COORDINATOR_A_ID,
      expiresAt: null,
      maxUses: null,
      usedCount: 2,
      revokedAt: null,
      createdAt: new Date('2026-10-01T09:00:00.000Z'),
      updatedAt: new Date('2026-10-01T09:00:00.000Z'),
    };

    it('returns join-link status without the secret token', async () => {
      mockPrisma.city.findUnique.mockResolvedValue(city);
      mockPrisma.cityInvite.findMany.mockResolvedValue([invite]);

      const result = await service.listJoinLinks(CITY_A_ID, coordinatorA());

      expect(result.links).toEqual([
        {
          role: 'coordinator',
          active: false,
          createdAt: null,
          usedCount: 0,
        },
        {
          role: 'volunteer',
          active: true,
          createdAt: '2026-10-01T09:00:00.000Z',
          usedCount: 2,
        },
      ]);
      expect(JSON.stringify(result)).not.toContain(invite.tokenHash);
      expect(JSON.stringify(result)).not.toContain('fake-join-token');
    });

    it('stores a hash and returns the raw token only on regenerate', async () => {
      mockPrisma.city.findUnique.mockResolvedValue(city);
      mockPrisma.cityInvite.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.cityInvite.create.mockImplementation(
        ({ data }: { data: { tokenHash: string } }) =>
          Promise.resolve({
            ...invite,
            tokenHash: data.tokenHash,
            usedCount: 0,
          })
      );

      const result = await service.regenerateJoinLink(
        CITY_A_ID,
        'volunteer',
        coordinatorA()
      );

      expect(mockPrisma.cityInvite.updateMany).toHaveBeenCalledWith({
        where: { cityId: CITY_A_ID, role: 'volunteer', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      const storedHash = mockPrisma.cityInvite.create.mock.calls[0]?.[0].data
        .tokenHash as string;
      expect(storedHash).toBe(hashJoinToken(result.token));
      expect(storedHash).not.toBe(result.token);
      expect(result.url).toContain(`/join/${result.token}`);
      expect(result.url).not.toContain(storedHash);
    });

    it('looks up an active invite by hashing the incoming raw token', async () => {
      mockPrisma.cityInvite.findUnique.mockResolvedValue(invite);

      const found = await service.findActiveInviteByRawToken('fake-join-token');

      expect(found).toEqual(invite);
      expect(mockPrisma.cityInvite.findUnique).toHaveBeenCalledWith({
        where: { tokenHash: hashJoinToken('fake-join-token') },
      });
    });

    it('does not look up a revoked invite or a hash used as the raw token', async () => {
      mockPrisma.cityInvite.findUnique.mockResolvedValue({
        ...invite,
        revokedAt: new Date('2026-10-02T09:00:00.000Z'),
      });

      await expect(
        service.findActiveInviteByRawToken('fake-join-token')
      ).resolves.toBeNull();

      mockPrisma.cityInvite.findUnique.mockResolvedValue(null);
      await expect(
        service.findActiveInviteByRawToken(invite.tokenHash)
      ).resolves.toBeNull();
    });

    it('does not look up an invite that has reached maxUses', async () => {
      mockPrisma.cityInvite.findUnique.mockResolvedValue({
        ...invite,
        maxUses: 1,
        usedCount: 1,
      });

      await expect(
        service.findActiveInviteByRawToken('fake-join-token')
      ).resolves.toBeNull();
    });

    it('previews a valid join token with Holon names and no secret', async () => {
      mockPrisma.cityInvite.findUnique.mockResolvedValue(invite);
      mockPrisma.city.findUnique.mockResolvedValue({
        ...city,
        isActive: true,
      });

      const preview = await service.previewJoinLink('fake-join-token');

      expect(preview).toEqual({
        cityId: CITY_A_ID,
        citySlug: 'holon',
        cityNameHe: 'חולון',
        cityNameEn: 'Holon',
        role: 'volunteer',
      });
      expect(JSON.stringify(preview)).not.toContain('fake-join-token');
      expect(mockPrisma.cityMembership.create).not.toHaveBeenCalled();
    });

    it('does not preview a revoked or unknown join token', async () => {
      mockPrisma.cityInvite.findUnique.mockResolvedValue({
        ...invite,
        revokedAt: new Date('2026-10-02T09:00:00.000Z'),
      });

      await expect(
        service.previewJoinLink('fake-join-token')
      ).rejects.toMatchObject({
        constructor: NotFoundException,
        message: 'cities.invalid_join_token',
      });

      mockPrisma.cityInvite.findUnique.mockResolvedValue(null);
      await expect(
        service.previewJoinLink('unknown-token')
      ).rejects.toMatchObject({ message: 'cities.invalid_join_token' });
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
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockAuthService.revokeAllUserSessions).not.toHaveBeenCalled();
    });

    it('removes another coordinator in a transaction then revokes sessions', async () => {
      mockPrisma.city.findUnique.mockResolvedValue(city);
      mockPrisma.cityMembership.findUnique.mockResolvedValue({
        id: 'membership-other',
        role: 'coordinator',
        status: 'active',
      });
      mockPrisma.cityMembership.count.mockResolvedValue(2);
      mockPrisma.cityMembership.update.mockResolvedValue({});
      mockPrisma.$queryRaw.mockResolvedValue([]);
      mockAuthService.revokeAllUserSessions.mockResolvedValue(undefined);

      const callOrder: string[] = [];
      mockPrisma.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrisma) => Promise<unknown>) => {
          callOrder.push('transaction');
          return callback(mockPrisma);
        }
      );
      mockAuthService.revokeAllUserSessions.mockImplementation(async () => {
        callOrder.push('revoke');
      });

      await service.removeCoordinator(CITY_A_ID, otherUser.id, coordinatorA());

      expect(mockPrisma.cityMembership.update).toHaveBeenCalledWith({
        where: { id: 'membership-other' },
        data: { status: 'removed' },
      });
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
      expect(mockAuthService.revokeAllUserSessions).toHaveBeenCalledWith(
        otherUser.id
      );
      expect(callOrder).toEqual(['transaction', 'revoke']);
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

  describe('join-link redemption and approval', () => {
    const holonCity = {
      ...city,
      isActive: true,
    };

    const volunteerInvite = {
      id: 'invite-volunteer',
      cityId: CITY_A_ID,
      role: 'volunteer' as const,
      tokenHash: hashJoinToken('fake-join-token'),
      createdById: COORDINATOR_A_ID,
      expiresAt: null,
      maxUses: null,
      usedCount: 0,
      revokedAt: null,
      createdAt: new Date('2026-10-01T09:00:00.000Z'),
      updatedAt: new Date('2026-10-01T09:00:00.000Z'),
    };

    const pendingMembership = {
      id: '99999999-9999-4999-8999-999999999999',
      cityId: CITY_A_ID,
      userId: APPLICANT_ID,
      role: 'volunteer' as const,
      status: 'pending' as const,
      inviteId: volunteerInvite.id,
      approvedById: null,
      approvedAt: null,
      homeArea: null,
      coordinatorNotes: null,
      createdAt: new Date('2026-10-28T09:00:00.000Z'),
      updatedAt: new Date('2026-10-28T09:00:00.000Z'),
      user: {
        id: APPLICANT_ID,
        firstName: 'Tamar',
        lastName: 'Shalev',
        email: 'tamar.shalev@example.com',
        phone: '+972506666666',
        archivedAt: null,
      },
    };

    it('creates a pending membership and never grants access from the link alone', async () => {
      mockPrisma.cityInvite.findUnique.mockResolvedValue(volunteerInvite);
      mockPrisma.city.findUnique.mockResolvedValue(holonCity);
      mockPrisma.cityMembership.findUnique.mockResolvedValue(null);
      mockPrisma.cityMembership.create.mockResolvedValue(pendingMembership);
      mockPrisma.cityInvite.update.mockResolvedValue({
        ...volunteerInvite,
        usedCount: 1,
      });

      const result = await service.redeemJoinLink(
        'fake-join-token',
        onboardedApplicant()
      );

      expect(result).toEqual({
        result: 'pending',
        membership: {
          membershipId: pendingMembership.id,
          cityId: CITY_A_ID,
          citySlug: 'holon',
          cityNameHe: 'חולון',
          cityNameEn: 'Holon',
          role: 'volunteer',
          status: 'pending',
        },
      });
      expect(mockPrisma.cityMembership.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'pending',
          role: 'volunteer',
          inviteId: volunteerInvite.id,
        }),
      });
      expect(mockPrisma.cityInvite.update).toHaveBeenCalledWith({
        where: { id: volunteerInvite.id },
        data: { usedCount: { increment: 1 } },
      });
    });

    it('returns the existing pending membership without incrementing usedCount', async () => {
      mockPrisma.cityInvite.findUnique.mockResolvedValue(volunteerInvite);
      mockPrisma.city.findUnique.mockResolvedValue(holonCity);
      mockPrisma.cityMembership.findUnique.mockResolvedValue(pendingMembership);

      const result = await service.redeemJoinLink(
        'fake-join-token',
        onboardedApplicant()
      );

      expect(result.result).toBe('already_pending');
      expect(result.membership.status).toBe('pending');
      expect(mockPrisma.cityMembership.create).not.toHaveBeenCalled();
      expect(mockPrisma.cityInvite.update).not.toHaveBeenCalled();
    });

    it('returns already_active for a member who already has access', async () => {
      mockPrisma.cityInvite.findUnique.mockResolvedValue(volunteerInvite);
      mockPrisma.city.findUnique.mockResolvedValue(holonCity);
      mockPrisma.cityMembership.findUnique.mockResolvedValue({
        ...pendingMembership,
        userId: COORDINATOR_A_ID,
        role: 'coordinator',
        status: 'active',
        approvedAt: new Date('2026-10-01T09:00:00.000Z'),
      });

      const result = await service.redeemJoinLink(
        'fake-join-token',
        coordinatorA()
      );

      expect(result.result).toBe('already_active');
      expect(result.membership.status).toBe('active');
      expect(mockPrisma.cityMembership.create).not.toHaveBeenCalled();
      expect(mockPrisma.cityInvite.update).not.toHaveBeenCalled();
    });

    it('rejects revoked and unknown tokens', async () => {
      mockPrisma.cityInvite.findUnique.mockResolvedValue({
        ...volunteerInvite,
        revokedAt: new Date('2026-10-02T09:00:00.000Z'),
      });

      await expect(
        service.redeemJoinLink('fake-join-token', onboardedApplicant())
      ).rejects.toMatchObject({
        constructor: NotFoundException,
        message: 'cities.invalid_join_token',
      });

      mockPrisma.cityInvite.findUnique.mockResolvedValue(null);
      await expect(
        service.redeemJoinLink('unknown-token', onboardedApplicant())
      ).rejects.toMatchObject({ message: 'cities.invalid_join_token' });
    });

    it('rejects a user who has not finished onboarding', async () => {
      await expect(
        service.redeemJoinLink('fake-join-token', notOnboardedUser())
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockPrisma.cityInvite.findUnique).not.toHaveBeenCalled();
    });

    it('reopens a removed membership as pending', async () => {
      mockPrisma.cityInvite.findUnique.mockResolvedValue(volunteerInvite);
      mockPrisma.city.findUnique.mockResolvedValue(holonCity);
      mockPrisma.cityMembership.findUnique.mockResolvedValue({
        ...pendingMembership,
        status: 'removed',
      });
      mockPrisma.cityMembership.update.mockResolvedValue(pendingMembership);
      mockPrisma.cityInvite.update.mockResolvedValue({
        ...volunteerInvite,
        usedCount: 1,
      });

      const result = await service.redeemJoinLink(
        'fake-join-token',
        onboardedApplicant()
      );

      expect(result.result).toBe('rejected');
      expect(result.membership.status).toBe('pending');
      expect(mockPrisma.cityMembership.update).toHaveBeenCalledWith({
        where: { id: pendingMembership.id },
        data: expect.objectContaining({
          status: 'pending',
          approvedById: null,
          approvedAt: null,
        }),
      });
      expect(mockPrisma.cityInvite.update).toHaveBeenCalled();
    });

    it('lists pending memberships for a city coordinator', async () => {
      mockPrisma.city.findUnique.mockResolvedValue(holonCity);
      mockPrisma.cityMembership.findMany.mockResolvedValue([pendingMembership]);

      const result = await service.listPendingMemberships(
        CITY_A_ID,
        coordinatorA()
      );

      expect(result.memberships).toHaveLength(1);
      expect(result.memberships[0]?.firstName).toBe('Tamar');
      expect(result.memberships[0]?.status).toBe('pending');
      expect(JSON.stringify(result)).not.toContain('fake-join-token');
    });

    it('approves a pending membership without granting access from the link alone', async () => {
      mockPrisma.city.findUnique.mockResolvedValue(holonCity);
      mockPrisma.cityMembership.findFirst.mockResolvedValue(pendingMembership);
      mockPrisma.cityMembership.update.mockResolvedValue({
        ...pendingMembership,
        status: 'active',
        approvedById: COORDINATOR_A_ID,
        approvedAt: new Date('2026-10-28T10:00:00.000Z'),
      });

      const result = await service.approveMembership(
        CITY_A_ID,
        pendingMembership.id,
        coordinatorA()
      );

      expect(result.status).toBe('active');
      expect(result.approvedAt).toBe('2026-10-28T10:00:00.000Z');
      expect(mockPrisma.cityMembership.update).toHaveBeenCalledWith({
        where: { id: pendingMembership.id },
        data: expect.objectContaining({
          status: 'active',
          approvedById: COORDINATOR_A_ID,
        }),
        include: expect.any(Object),
      });
    });

    it('rejects a pending membership so the leaked link still grants no access', async () => {
      mockPrisma.city.findUnique.mockResolvedValue(holonCity);
      mockPrisma.cityMembership.findFirst.mockResolvedValue(pendingMembership);
      mockPrisma.cityMembership.update.mockResolvedValue({
        ...pendingMembership,
        status: 'removed',
      });

      const result = await service.rejectMembership(
        CITY_A_ID,
        pendingMembership.id,
        coordinatorA()
      );

      expect(result.status).toBe('removed');
      expect(mockPrisma.cityMembership.update).toHaveBeenCalledWith({
        where: { id: pendingMembership.id },
        data: {
          status: 'removed',
          approvedById: null,
          approvedAt: null,
        },
        include: expect.any(Object),
      });
    });

    it('refuses to approve a membership that is not pending', async () => {
      mockPrisma.city.findUnique.mockResolvedValue(holonCity);
      mockPrisma.cityMembership.findFirst.mockResolvedValue({
        ...pendingMembership,
        status: 'active',
      });

      await expect(
        service.approveMembership(
          CITY_A_ID,
          pendingMembership.id,
          coordinatorA()
        )
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('forbids volunteers from listing, approving, or rejecting', async () => {
      await expect(
        service.listPendingMemberships(CITY_A_ID, volunteerA())
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        service.approveMembership(CITY_A_ID, pendingMembership.id, volunteerA())
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        service.rejectMembership(CITY_A_ID, pendingMembership.id, volunteerA())
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('hides another city from a coordinator', async () => {
      await expect(
        service.listPendingMemberships(CITY_A_ID, coordinatorB())
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        service.approveMembership(
          CITY_A_ID,
          pendingMembership.id,
          coordinatorB()
        )
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        service.rejectMembership(
          CITY_A_ID,
          pendingMembership.id,
          coordinatorB()
        )
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lets a super admin approve a pending coordinator membership', async () => {
      mockPrisma.city.findUnique.mockResolvedValue(holonCity);
      mockPrisma.cityMembership.findFirst.mockResolvedValue({
        ...pendingMembership,
        role: 'coordinator',
      });
      mockPrisma.cityMembership.update.mockResolvedValue({
        ...pendingMembership,
        role: 'coordinator',
        status: 'active',
        approvedById: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        approvedAt: new Date('2026-10-28T10:00:00.000Z'),
      });

      const result = await service.approveMembership(
        CITY_A_ID,
        pendingMembership.id,
        superAdmin()
      );

      expect(result.status).toBe('active');
      expect(result.role).toBe('coordinator');
    });
  });
});
