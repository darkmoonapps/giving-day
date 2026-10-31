import { subject } from '@casl/ability';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AbilityFactory } from '../abilities/ability.factory';
import type { UserWithMemberships } from '../abilities/ability.factory';
import {
  assertActiveVolunteerInCity,
  assertCanManageOnCity,
  assertCanOnCity,
} from './city-access';

describe('assertCanOnCity', () => {
  const factory = new AbilityFactory();
  const cityId = '11111111-1111-4111-8111-111111111111';

  const createUser = (
    overrides: Partial<UserWithMemberships> = {}
  ): UserWithMemberships => ({
    id: 'user-id',
    firstName: 'Dana',
    lastName: 'Cohen',
    phone: '+972501111111',
    email: 'dana@example.com',
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

  it('allows a coordinator to read settings in their city', () => {
    const ability = factory.createForUser(
      createUser({
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
      })
    );

    expect(() => {
      assertCanOnCity(ability, 'read', 'CitySettings', cityId);
    }).not.toThrow();
  });

  it('hides another city from a coordinator with 404', () => {
    const ability = factory.createForUser(
      createUser({
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
      })
    );

    expect(() => {
      assertCanOnCity(
        ability,
        'read',
        'CitySettings',
        '22222222-2222-4222-8222-222222222222'
      );
    }).toThrow(NotFoundException);
  });

  it('hides settings from a volunteer with 404 at the instance check', () => {
    const ability = factory.createForUser(
      createUser({
        memberships: [
          {
            id: 'membership-2',
            cityId,
            userId: 'user-id',
            role: 'volunteer',
            status: 'active',
            inviteId: null,
            approvedById: 'coord-id',
            approvedAt: new Date(),
            homeArea: 'North',
            coordinatorNotes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      })
    );

    expect(ability.can('read', subject('CitySettings', { cityId }))).toBe(
      false
    );
    expect(() => {
      assertCanOnCity(ability, 'read', 'CitySettings', cityId);
    }).toThrow(NotFoundException);
  });

  it('allows a volunteer to read deliveries in their city', () => {
    const ability = factory.createForUser(
      createUser({
        memberships: [
          {
            id: 'membership-2',
            cityId,
            userId: 'user-id',
            role: 'volunteer',
            status: 'active',
            inviteId: null,
            approvedById: 'coord-id',
            approvedAt: new Date(),
            homeArea: 'North',
            coordinatorNotes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      })
    );

    expect(() => {
      assertCanOnCity(ability, 'read', 'Delivery', cityId);
    }).not.toThrow();
    expect(() => {
      assertCanOnCity(
        ability,
        'read',
        'Delivery',
        '22222222-2222-4222-8222-222222222222'
      );
    }).toThrow(NotFoundException);
  });

  it('allows a coordinator to manage elders in their city', () => {
    const ability = factory.createForUser(
      createUser({
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
      })
    );

    expect(() => {
      assertCanManageOnCity(ability, 'Elder', cityId);
    }).not.toThrow();
  });

  it('forbids a volunteer from managing elders in their city', () => {
    const ability = factory.createForUser(
      createUser({
        memberships: [
          {
            id: 'membership-2',
            cityId,
            userId: 'user-id',
            role: 'volunteer',
            status: 'active',
            inviteId: null,
            approvedById: 'coord-id',
            approvedAt: new Date(),
            homeArea: 'North',
            coordinatorNotes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      })
    );

    expect(() => {
      assertCanManageOnCity(ability, 'Elder', cityId);
    }).toThrow(ForbiddenException);
  });

  it('allows a coordinator to approve change requests in their city', () => {
    const ability = factory.createForUser(
      createUser({
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
      })
    );

    expect(() => {
      assertCanOnCity(ability, 'read', 'ElderChangeRequest', cityId);
    }).not.toThrow();
    expect(() => {
      assertCanOnCity(ability, 'approve', 'ElderChangeRequest', cityId);
    }).not.toThrow();
    expect(() => {
      assertCanOnCity(ability, 'reject', 'ElderChangeRequest', cityId);
    }).not.toThrow();
  });

  it('hides another city change request from a coordinator with 404', () => {
    const ability = factory.createForUser(
      createUser({
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
      })
    );

    expect(() => {
      assertCanOnCity(
        ability,
        'approve',
        'ElderChangeRequest',
        '22222222-2222-4222-8222-222222222222'
      );
    }).toThrow(NotFoundException);
  });

  it('allows a volunteer to create a change request in their city only', () => {
    const ability = factory.createForUser(
      createUser({
        memberships: [
          {
            id: 'membership-2',
            cityId,
            userId: 'user-id',
            role: 'volunteer',
            status: 'active',
            inviteId: null,
            approvedById: 'coord-id',
            approvedAt: new Date(),
            homeArea: 'North',
            coordinatorNotes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      })
    );

    expect(() => {
      assertCanOnCity(ability, 'create', 'ElderChangeRequest', cityId);
    }).not.toThrow();
    expect(() => {
      assertCanOnCity(ability, 'read', 'ElderChangeRequest', cityId);
    }).not.toThrow();
    expect(() => {
      assertCanOnCity(
        ability,
        'create',
        'ElderChangeRequest',
        '22222222-2222-4222-8222-222222222222'
      );
    }).toThrow(NotFoundException);
    expect(() => {
      assertCanOnCity(ability, 'approve', 'ElderChangeRequest', cityId);
    }).toThrow(NotFoundException);
  });

  it('allows a coordinator to manage matches in their city', () => {
    const ability = factory.createForUser(
      createUser({
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
      })
    );

    expect(() => {
      assertCanManageOnCity(ability, 'Match', cityId);
    }).not.toThrow();
  });

  it('forbids a volunteer from managing matches in their city', () => {
    const ability = factory.createForUser(
      createUser({
        memberships: [
          {
            id: 'membership-2',
            cityId,
            userId: 'user-id',
            role: 'volunteer',
            status: 'active',
            inviteId: null,
            approvedById: 'coord-id',
            approvedAt: new Date(),
            homeArea: 'North',
            coordinatorNotes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      })
    );

    expect(() => {
      assertCanManageOnCity(ability, 'Match', cityId);
    }).toThrow(NotFoundException);
  });

  it('hides another city elders list with 404', () => {
    const ability = factory.createForUser(
      createUser({
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
      })
    );

    expect(() => {
      assertCanManageOnCity(
        ability,
        'Elder',
        '22222222-2222-4222-8222-222222222222'
      );
    }).toThrow(NotFoundException);
  });

  it('allows an active volunteer to respond in their city', () => {
    expect(() => {
      assertActiveVolunteerInCity(
        createUser({
          memberships: [
            {
              id: 'membership-2',
              cityId,
              userId: 'user-id',
              role: 'volunteer',
              status: 'active',
              inviteId: null,
              approvedById: 'coord-id',
              approvedAt: new Date(),
              homeArea: 'North',
              coordinatorNotes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        }),
        cityId
      );
    }).not.toThrow();
  });

  it('forbids a coordinator from responding as a volunteer', () => {
    expect(() => {
      assertActiveVolunteerInCity(
        createUser({
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
        }),
        cityId
      );
    }).toThrow(ForbiddenException);
  });
});
