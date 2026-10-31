import { subject } from '@casl/ability';
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

      expect(ability.can('create', 'Elder')).toBe(true);
      expect(ability.can('read', 'Elder')).toBe(true);
      expect(ability.can('update', 'Elder')).toBe(true);
      expect(ability.can('delete', 'Elder')).toBe(true);
      expect(ability.can('view_pii', 'Elder')).toBe(true);
    });

    it('should allow coordinator to manage city settings', () => {
      const ability = factory.createForUser(coordinatorUser);

      expect(ability.can('read', 'CitySettings')).toBe(true);
      expect(ability.can('update', 'CitySettings')).toBe(true);
    });

    it('should allow coordinator to manage invites', () => {
      const ability = factory.createForUser(coordinatorUser);

      expect(ability.can('create', 'CityInvite')).toBe(true);
      expect(ability.can('read', 'CityInvite')).toBe(true);
      expect(ability.can('update', 'CityInvite')).toBe(true);
      expect(ability.can('delete', 'CityInvite')).toBe(true);
    });

    it('should allow coordinator to approve memberships', () => {
      const ability = factory.createForUser(coordinatorUser);

      expect(ability.can('read', 'CityMembership')).toBe(true);
      expect(ability.can('create', 'CityMembership')).toBe(true);
      expect(ability.can('approve', 'CityMembership')).toBe(true);
      expect(ability.can('reject', 'CityMembership')).toBe(true);
      expect(ability.can('update', 'CityMembership')).toBe(true);
      expect(ability.can('delete', 'CityMembership')).toBe(true);
    });

    it('should scope city settings, invites, and coordinators to the city', () => {
      const ability = factory.createForUser(coordinatorUser);

      expect(ability.can('read', subject('CitySettings', { cityId }))).toBe(
        true
      );
      expect(ability.can('update', subject('CitySettings', { cityId }))).toBe(
        true
      );
      expect(
        ability.can('read', subject('CitySettings', { cityId: 'city-other' }))
      ).toBe(false);
      expect(
        ability.can('update', subject('CitySettings', { cityId: 'city-other' }))
      ).toBe(false);

      expect(ability.can('read', subject('CityInvite', { cityId }))).toBe(true);
      expect(ability.can('create', subject('CityInvite', { cityId }))).toBe(
        true
      );
      expect(
        ability.can('read', subject('CityInvite', { cityId: 'city-other' }))
      ).toBe(false);

      expect(
        ability.can(
          'create',
          subject('CityMembership', { cityId, role: 'coordinator' })
        )
      ).toBe(true);
      expect(
        ability.can(
          'create',
          subject('CityMembership', {
            cityId: 'city-other',
            role: 'coordinator',
          })
        )
      ).toBe(false);
      expect(ability.can('delete', subject('CityMembership', { cityId }))).toBe(
        true
      );
      expect(
        ability.can(
          'delete',
          subject('CityMembership', { cityId: 'city-other' })
        )
      ).toBe(false);
      expect(
        ability.can('approve', subject('CityMembership', { cityId }))
      ).toBe(true);
      expect(ability.can('reject', subject('CityMembership', { cityId }))).toBe(
        true
      );
      expect(
        ability.can(
          'approve',
          subject('CityMembership', { cityId: 'city-other' })
        )
      ).toBe(false);
      expect(
        ability.can(
          'reject',
          subject('CityMembership', { cityId: 'city-other' })
        )
      ).toBe(false);
    });

    it('should allow coordinator to manage distribution days', () => {
      const ability = factory.createForUser(coordinatorUser);

      expect(ability.can('create', 'DistributionDay')).toBe(true);
      expect(ability.can('publish', 'DistributionDay')).toBe(true);
      expect(ability.can('close', 'DistributionDay')).toBe(true);
      expect(ability.can('read', 'DayParticipation')).toBe(true);
      expect(ability.can('read', subject('DayParticipation', { cityId }))).toBe(
        true
      );
      expect(
        ability.can(
          'read',
          subject('DayParticipation', { cityId: 'city-other' })
        )
      ).toBe(false);
      expect(ability.can('create', 'DayParticipation')).toBe(false);
    });

    it('should scope distribution day create and close to the city', () => {
      const ability = factory.createForUser(coordinatorUser);

      expect(
        ability.can('create', subject('DistributionDay', { cityId }))
      ).toBe(true);
      expect(ability.can('close', subject('DistributionDay', { cityId }))).toBe(
        true
      );
      expect(
        ability.can(
          'create',
          subject('DistributionDay', { cityId: 'city-other' })
        )
      ).toBe(false);
      expect(
        ability.can(
          'close',
          subject('DistributionDay', { cityId: 'city-other' })
        )
      ).toBe(false);
    });

    it('should allow coordinator to reassign deliveries', () => {
      const ability = factory.createForUser(coordinatorUser);

      expect(ability.can('reassign', 'Delivery')).toBe(true);
      expect(ability.can('update', 'Delivery')).toBe(true);
      expect(ability.can('reassign', subject('Delivery', { cityId }))).toBe(
        true
      );
      expect(
        ability.can('reassign', subject('Delivery', { cityId: 'city-other' }))
      ).toBe(false);
      expect(ability.can('read', subject('Delivery', { cityId }))).toBe(true);
    });

    it('should allow coordinator to manage message templates', () => {
      const ability = factory.createForUser(coordinatorUser);

      expect(ability.can('create', 'MessageTemplate')).toBe(true);
      expect(ability.can('read', 'MessageTemplate')).toBe(true);
      expect(ability.can('update', 'MessageTemplate')).toBe(true);
      expect(ability.can('delete', 'MessageTemplate')).toBe(true);
    });

    it('should allow coordinator to read audit logs', () => {
      const ability = factory.createForUser(coordinatorUser);

      expect(ability.can('read', 'AuditLog')).toBe(true);
      expect(ability.can('read', 'NotificationLog')).toBe(true);
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

      expect(ability.can('read', 'Match')).toBe(true);
    });

    it('should allow volunteer to read their own deliveries', () => {
      const ability = factory.createForUser(volunteerUser);

      expect(ability.can('read', 'Delivery')).toBe(true);
      expect(ability.can('update', 'Delivery')).toBe(true);
      expect(ability.can('read', subject('Delivery', { cityId }))).toBe(true);
      expect(
        ability.can('read', subject('Delivery', { cityId: 'city-other' }))
      ).toBe(false);
    });

    it('should allow volunteer to create change requests', () => {
      const ability = factory.createForUser(volunteerUser);

      expect(ability.can('create', 'ElderChangeRequest')).toBe(true);
      expect(ability.can('read', 'ElderChangeRequest')).toBe(true);
    });

    it('should allow volunteer to manage their own participation', () => {
      const ability = factory.createForUser(volunteerUser);

      expect(ability.can('create', 'DayParticipation')).toBe(true);
      expect(ability.can('update', 'DayParticipation')).toBe(true);
      expect(
        ability.can('create', subject('DayParticipation', { cityId }))
      ).toBe(true);
      expect(
        ability.can(
          'create',
          subject('DayParticipation', { cityId: 'city-other' })
        )
      ).toBe(false);
      expect(ability.can('read', 'DayParticipation')).toBe(false);
    });

    it('should allow volunteer to read assigned elders', () => {
      const ability = factory.createForUser(volunteerUser);

      expect(ability.can('read', 'Elder')).toBe(true);
      expect(ability.can('view_pii', 'Elder')).toBe(true);
      expect(ability.can('read', 'ElderContact')).toBe(true);
    });

    it('should not allow volunteer to manage elders', () => {
      const ability = factory.createForUser(volunteerUser);

      expect(ability.can('create', 'Elder')).toBe(false);
      expect(ability.can('delete', 'Elder')).toBe(false);
    });

    it('should not allow volunteer to approve memberships', () => {
      const ability = factory.createForUser(volunteerUser);

      expect(ability.can('approve', 'CityMembership')).toBe(false);
      expect(ability.can('reject', 'CityMembership')).toBe(false);
    });

    it('should not allow volunteer to reassign deliveries', () => {
      const ability = factory.createForUser(volunteerUser);

      expect(ability.can('reassign', 'Delivery')).toBe(false);
    });

    it('should allow volunteer to read distribution days in their city only', () => {
      const ability = factory.createForUser(volunteerUser);

      expect(ability.can('read', 'DistributionDay')).toBe(true);
      expect(ability.can('read', subject('DistributionDay', { cityId }))).toBe(
        true
      );
      expect(
        ability.can(
          'read',
          subject('DistributionDay', { cityId: 'city-other' })
        )
      ).toBe(false);
      expect(ability.can('create', 'DistributionDay')).toBe(false);
      expect(ability.can('publish', 'DistributionDay')).toBe(false);
      expect(ability.can('close', 'DistributionDay')).toBe(false);
    });

    it('should not allow volunteer to manage city settings', () => {
      const ability = factory.createForUser(volunteerUser);

      expect(ability.can('read', 'CitySettings')).toBe(false);
      expect(ability.can('update', 'CitySettings')).toBe(false);
      expect(ability.can('read', subject('CitySettings', { cityId }))).toBe(
        false
      );
    });

    it('should not allow volunteer to manage join links or coordinators', () => {
      const ability = factory.createForUser(volunteerUser);

      expect(ability.can('read', 'CityInvite')).toBe(false);
      expect(ability.can('create', 'CityInvite')).toBe(false);
      expect(ability.can('read', 'CityMembership')).toBe(true);
      expect(
        ability.can(
          'read',
          subject('CityMembership', { cityId, userId: volunteerId })
        )
      ).toBe(true);
      expect(
        ability.can(
          'read',
          subject('CityMembership', {
            cityId,
            userId: 'someone-else',
          })
        )
      ).toBe(false);
      expect(ability.can('create', 'CityMembership')).toBe(false);
      expect(ability.can('delete', 'CityMembership')).toBe(false);
    });
  });

  describe('User with no memberships', () => {
    it('should only allow managing own profile and push subscriptions', () => {
      const user = createUser({ memberships: [] });
      const ability = factory.createForUser(user);

      expect(ability.can('read', 'User')).toBe(true);
      expect(ability.can('update', 'User')).toBe(true);
      expect(ability.can('manage', 'PushSubscription')).toBe(true);

      expect(ability.can('read', 'Elder')).toBe(false);
      expect(ability.can('read', 'City')).toBe(false);
      expect(ability.can('read', 'CityInvite')).toBe(false);
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

    it('should have coordinator permissions for city-level resources', () => {
      const ability = factory.createForUser(multiRoleUser);

      expect(ability.can('manage', 'Elder')).toBe(true);
      expect(ability.can('approve', 'CityMembership')).toBe(true);
      expect(ability.can('reassign', 'Delivery')).toBe(true);
    });

    it('should have volunteer permissions for volunteer resources', () => {
      const ability = factory.createForUser(multiRoleUser);

      expect(ability.can('read', 'Delivery')).toBe(true);
      expect(ability.can('create', 'DayParticipation')).toBe(true);
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

      expect(ability.can('read', 'City')).toBe(false);
      expect(ability.can('read', 'Elder')).toBe(false);
      expect(ability.can('read', 'Delivery')).toBe(false);
      expect(ability.can('read', 'DistributionDay')).toBe(false);
    });

    it('should still allow managing own profile', () => {
      const ability = factory.createForUser(pendingUser);

      expect(ability.can('read', 'User')).toBe(true);
      expect(ability.can('update', 'User')).toBe(true);
    });
  });
});
