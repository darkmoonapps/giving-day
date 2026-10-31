import type { UserWithMemberships } from '../abilities/ability.factory';
import type { CityMembership } from '@prisma/client';

const NOW = new Date('2026-10-01T09:00:00.000Z');

export const CITY_A_ID = '11111111-1111-4111-8111-111111111111';
export const CITY_B_ID = '22222222-2222-4222-8222-222222222222';
export const COORDINATOR_A_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export const VOLUNTEER_A_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
export const VOLUNTEER_B_ID = '99999999-9999-4999-8999-999999999999';
export const SUPER_ADMIN_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
export const COORDINATOR_B_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
export const APPLICANT_ID = '12121212-1212-4121-8121-121212121212';
export const NOT_ONBOARDED_ID = '13131313-1313-4131-8131-131313131313';

function membership(
  overrides: Partial<CityMembership> &
    Pick<CityMembership, 'id' | 'cityId' | 'userId' | 'role'>
): CityMembership {
  return {
    status: 'active',
    inviteId: null,
    approvedById: null,
    approvedAt: NOW,
    homeArea: null,
    coordinatorNotes: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function user(
  overrides: Partial<UserWithMemberships> & Pick<UserWithMemberships, 'id'>
): UserWithMemberships {
  return {
    firstName: 'Fake',
    lastName: 'User',
    phone: '+972500000000',
    email: 'fake@example.com',
    birthDate: null,
    locale: 'he',
    themePref: 'system',
    isSuperAdmin: false,
    onboardedAt: NOW,
    lastLoginAt: NOW,
    archivedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    memberships: [],
    ...overrides,
  };
}

export function coordinatorA(): UserWithMemberships {
  return user({
    id: COORDINATOR_A_ID,
    firstName: 'Noa',
    lastName: 'Levi',
    email: 'noa.levi@example.com',
    phone: '+972501111111',
    memberships: [
      membership({
        id: 'membership-coord-a',
        cityId: CITY_A_ID,
        userId: COORDINATOR_A_ID,
        role: 'coordinator',
      }),
    ],
  });
}

export function volunteerA(): UserWithMemberships {
  return user({
    id: VOLUNTEER_A_ID,
    firstName: 'Yonatan',
    lastName: 'Bar',
    email: 'yonatan.bar@example.com',
    phone: '+972502222222',
    memberships: [
      membership({
        id: 'membership-vol-a',
        cityId: CITY_A_ID,
        userId: VOLUNTEER_A_ID,
        role: 'volunteer',
        homeArea: 'North',
      }),
    ],
  });
}

export function volunteerB(): UserWithMemberships {
  return user({
    id: VOLUNTEER_B_ID,
    firstName: 'Dana',
    lastName: 'Levi',
    email: 'dana.levi@example.com',
    phone: '+972505555555',
    memberships: [
      membership({
        id: 'membership-vol-b',
        cityId: CITY_A_ID,
        userId: VOLUNTEER_B_ID,
        role: 'volunteer',
        homeArea: 'South',
      }),
    ],
  });
}

export function coordinatorB(): UserWithMemberships {
  return user({
    id: COORDINATOR_B_ID,
    firstName: 'Maya',
    lastName: 'Cohen',
    email: 'maya.cohen@example.com',
    phone: '+972503333333',
    memberships: [
      membership({
        id: 'membership-coord-b',
        cityId: CITY_B_ID,
        userId: COORDINATOR_B_ID,
        role: 'coordinator',
      }),
    ],
  });
}

export function superAdmin(): UserWithMemberships {
  return user({
    id: SUPER_ADMIN_ID,
    firstName: 'Super',
    lastName: 'Admin',
    email: 'super.admin@example.com',
    phone: '+972504444444',
    isSuperAdmin: true,
  });
}

export function pendingVolunteer(): UserWithMemberships {
  return user({
    id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    firstName: 'Pending',
    lastName: 'Member',
    email: 'pending.member@example.com',
    memberships: [
      membership({
        id: 'membership-pending',
        cityId: CITY_A_ID,
        userId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        role: 'volunteer',
        status: 'pending',
        approvedAt: null,
      }),
    ],
  });
}

export function onboardedApplicant(): UserWithMemberships {
  return user({
    id: APPLICANT_ID,
    firstName: 'Tamar',
    lastName: 'Shalev',
    email: 'tamar.shalev@example.com',
    phone: '+972506666666',
    memberships: [],
  });
}

export function notOnboardedUser(): UserWithMemberships {
  return user({
    id: NOT_ONBOARDED_ID,
    firstName: null,
    lastName: null,
    phone: null,
    email: 'new.user@example.com',
    onboardedAt: null,
    memberships: [],
  });
}
