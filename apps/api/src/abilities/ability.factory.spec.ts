import { Test, TestingModule } from '@nestjs/testing';
import { AbilityFactory } from './ability.factory';
import type { UserWithMemberships } from './ability.factory';

describe('AbilityFactory', () => {
  let factory: AbilityFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AbilityFactory],
    }).compile();

    factory = module.get<AbilityFactory>(AbilityFactory);
  });

  const createUser = (
    overrides: Partial<UserWithMemberships> = {}
  ): UserWithMemberships => ({
    id: 'user-id',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+972501234567',
    email: 'john@example.com',
    birthDate: null,
    locale: 'he',
    themePref: 'system',
    isSuperAdmin: false,
    onboardedAt: new Date(),
    lastLoginAt: new Date(),
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    memberships: [],
    ...overrides,
  });

  describe('Super Admin', () => {
    it('should grant all permissions to super admin', () => {
      const user = createUser({ isSuperAdmin: true });
      const ability = factory.createForUser(user);

      expect(ability.can('manage', 'all')).toBe(true);
      expect(ability.can('create', 'City')).toBe(true);
      expect(ability.can('delete', 'City')).toBe(true);
      expect(ability.can('manage', 'Elder')).toBe(true);
    });
  });

  describe('Coordinator', () => {
    const cityId = 'city-123';

    const coordinatorUser = createUser({
      memberships: [
        {
          id: 'membership-1',
          cityId,
          userId: 'user-id',
          role: 'coordinator',
          status: 'active',
          inviteId: null,
          approvedById: null,
          approvedAt: new Date(),
          homeArea: null,
          coordinatorNotes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    it('should allow coordinator to manage elders in their city', () => {
      const ability = factory.createForUser(coordinatorUser);

      expect(ability.can('create', 'Elder', { cityId })).toBe(true);
      expect(ability.can('read', 'Elder', { cityId })).toBe(true);
      expect(ability.can('update', 'Elder', { cityId })).toBe(true);
      expect(ability.can('delete', 'Elder', { cityId })).toBe(true);
      expect(ability.can('view_pii', 'Elder', { cityId })).toBe(true);
    });

    it('should allow coordinator to manage city settings', () => {
      const ability = factory.createForUser(coordinatorUser);

      expect(ability.can('read', 'CitySettings', { cityId })).toBe(true);
      expect(ability.can('update', 'CitySettings', { cityId })).toBe(true);
    });

    it('should allow coordinator to manage invites', () => {
      const ability = factory.createForUser(coordinatorUser);

      expect(ability.can('create', 'CityInvite', { cityId })).toBe(true);
      expect(ability.can('read', 'CityInvite', { cityId })).toBe(true);
      expect(ability.can('update', 'CityInvite', { cityId })).toBe(true);
      expect(ability.can('delete', 'CityInvite', { cityId })).toBe(true);
    });

    it('should allow coordinator to approve memberships', () => {
      const ability = factory.createForUser(coordinatorUser);

      expect(
        ability.can('approve', 'CityMembership', { cityId, role: 'volunteer' })
      ).toBe(true);
      expect(
        ability.can('approve', 'CityMembership', {
          cityId,
          role: 'coordinator',
        })
      ).toBe(true);
    });

    it('should allow coordinator to manage distribution days', () => {
      const ability = factory.createForUser(coordinatorUser);

      expect(ability.can('create', 'DistributionDay', { cityId })).toBe(true);
      expect(ability.can('publish', 'DistributionDay', { cityId })).toBe(true);
      expect(ability.can('close', 'DistributionDay', { cityId })).toBe(true);
    });

    it('should allow coordinator to reassign deliveries', () => {
      const ability = factory.createForUser(coordinatorUser);

      expect(ability.can('reassign', 'Delivery', { cityId })).toBe(true);
      expect(ability.can('update', 'Delivery', { cityId })).toBe(true);
    });

    it('should not allow coordinator to access another city', () => {
      const ability = factory.createForUser(coordinatorUser);
      const otherCityId = 'other-city-456';

      expect(ability.can('read', 'Elder', { cityId: otherCityId })).toBe(false);
      expect(
        ability.can('update', 'CitySettings', { cityId: otherCityId })
      ).toBe(false);
    });
  });

  describe('Volunteer', () => {
    const cityId = 'city-123';
    const volunteerId = 'volunteer-id';

    const volunteerUser = createUser({
      id: volunteerId,
      memberships: [
        {
          id: 'membership-2',
          cityId,
          userId: volunteerId,
          role: 'volunteer',
          status: 'active',
          inviteId: null,
          approvedById: 'coord-id',
          approvedAt: new Date(),
          homeArea: 'North District',
          coordinatorNotes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    it('should allow volunteer to read their own matches', () => {
      const ability = factory.createForUser(volunteerUser);

      expect(ability.can('read', 'Match', { volunteerId })).toBe(true);
    });

    it('should allow volunteer to read their own deliveries', () => {
      const ability = factory.createForUser(volunteerUser);

      expect(ability.can('read', 'Delivery', { volunteerId })).toBe(true);
      expect(
        ability.can('update', 'Delivery', {
          volunteerId,
          status: 'picked',
        })
      ).toBe(true);
    });

    it('should allow volunteer to create change requests for assigned elders', () => {
      const ability = factory.createForUser(volunteerUser);

      expect(
        ability.can('create', 'ElderChangeRequest', {
          cityId,
          'elder.deliveries.volunteerId': volunteerId,
        })
      ).toBe(true);
    });

    it('should allow volunteer to manage their own participation', () => {
      const ability = factory.createForUser(volunteerUser);

      expect(
        ability.can('create', 'DayParticipation', {
          volunteerId,
          cityId,
        })
      ).toBe(true);
      expect(ability.can('update', 'DayParticipation', { volunteerId })).toBe(
        true
      );
    });

    it('should not allow volunteer to manage elders', () => {
      const ability = factory.createForUser(volunteerUser);

      expect(ability.can('create', 'Elder', { cityId })).toBe(false);
      expect(ability.can('delete', 'Elder', { cityId })).toBe(false);
    });

    it('should not allow volunteer to approve memberships', () => {
      const ability = factory.createForUser(volunteerUser);

      expect(ability.can('approve', 'CityMembership', { cityId })).toBe(false);
    });

    it('should not allow volunteer to reassign deliveries', () => {
      const ability = factory.createForUser(volunteerUser);

      expect(ability.can('reassign', 'Delivery', { cityId })).toBe(false);
    });
  });

  describe('User with no memberships', () => {
    it('should only allow managing own profile and push subscriptions', () => {
      const user = createUser({ memberships: [] });
      const ability = factory.createForUser(user);

      expect(ability.can('read', 'User', { id: user.id })).toBe(true);
      expect(ability.can('update', 'User', { id: user.id })).toBe(true);
      expect(
        ability.can('manage', 'PushSubscription', { userId: user.id })
      ).toBe(true);

      expect(ability.can('read', 'Elder')).toBe(false);
      expect(ability.can('read', 'City')).toBe(false);
    });
  });

  describe('User with multiple roles in different cities', () => {
    const city1 = 'city-1';
    const city2 = 'city-2';
    const userId = 'multi-role-user';

    const multiRoleUser = createUser({
      id: userId,
      memberships: [
        {
          id: 'membership-1',
          cityId: city1,
          userId,
          role: 'coordinator',
          status: 'active',
          inviteId: null,
          approvedById: null,
          approvedAt: new Date(),
          homeArea: null,
          coordinatorNotes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'membership-2',
          cityId: city2,
          userId,
          role: 'volunteer',
          status: 'active',
          inviteId: null,
          approvedById: 'coord-id',
          approvedAt: new Date(),
          homeArea: 'South',
          coordinatorNotes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    it('should have coordinator permissions in city1', () => {
      const ability = factory.createForUser(multiRoleUser);

      expect(ability.can('manage', 'Elder', { cityId: city1 })).toBe(true);
      expect(ability.can('approve', 'CityMembership', { cityId: city1 })).toBe(
        true
      );
    });

    it('should have volunteer permissions in city2', () => {
      const ability = factory.createForUser(multiRoleUser);

      expect(ability.can('read', 'Delivery', { volunteerId: userId })).toBe(
        true
      );
      expect(ability.can('manage', 'Elder', { cityId: city2 })).toBe(false);
    });
  });

  describe('Pending membership', () => {
    const cityId = 'city-123';
    const userId = 'pending-user';

    const pendingUser = createUser({
      id: userId,
      memberships: [
        {
          id: 'membership-pending',
          cityId,
          userId,
          role: 'volunteer',
          status: 'pending',
          inviteId: 'invite-id',
          approvedById: null,
          approvedAt: null,
          homeArea: null,
          coordinatorNotes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    it('should not grant city permissions for pending membership', () => {
      const ability = factory.createForUser(pendingUser);

      expect(ability.can('read', 'City', { id: cityId })).toBe(false);
      expect(ability.can('read', 'Elder', { cityId })).toBe(false);
      expect(ability.can('read', 'Delivery', { volunteerId: userId })).toBe(
        false
      );
    });

    it('should still allow managing own profile', () => {
      const ability = factory.createForUser(pendingUser);

      expect(ability.can('read', 'User', { id: userId })).toBe(true);
      expect(ability.can('update', 'User', { id: userId })).toBe(true);
    });
  });
});
