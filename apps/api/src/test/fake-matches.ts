import type { Elder, Match, User } from '@prisma/client';
import { CITY_A_ID, VOLUNTEER_A_ID } from './fake-users';
import { ELDER_A_ID, fakeElder } from './fake-elders';

const NOW = new Date('2026-10-01T09:00:00.000Z');
const STARTS_AT = new Date('2026-10-01T00:00:00.000Z');

export const MATCH_A_ID = '15151515-1515-4151-8151-151515151515';
export const MATCH_ONE_TIME_ID = '16161616-1616-4161-8161-161616161616';
export const DAY_A_ID = '33333333-3333-4333-8333-333333333333';
export const DAY_DATE = new Date('2026-11-12T00:00:00.000Z');

export function fakeVolunteerUser(
  overrides: Partial<User> = {}
): Pick<User, 'id' | 'firstName' | 'lastName' | 'archivedAt'> {
  return {
    id: VOLUNTEER_A_ID,
    firstName: 'Yonatan',
    lastName: 'Bar',
    archivedAt: null,
    ...overrides,
  };
}

export function fakeMatch(
  overrides: Partial<Match> & {
    elder?: Pick<Elder, 'id' | 'fullName' | 'status'>;
    volunteer?: Pick<User, 'id' | 'firstName' | 'lastName'>;
  } = {}
): Match & {
  elder: Pick<Elder, 'id' | 'fullName' | 'status'>;
  volunteer: Pick<User, 'id' | 'firstName' | 'lastName'>;
} {
  const { elder, volunteer, ...matchOverrides } = overrides;
  const elderId = matchOverrides.elderId ?? ELDER_A_ID;
  const volunteerId = matchOverrides.volunteerId ?? VOLUNTEER_A_ID;

  return {
    id: MATCH_A_ID,
    createdAt: NOW,
    updatedAt: NOW,
    cityId: CITY_A_ID,
    elderId,
    volunteerId,
    type: 'permanent',
    dayId: null,
    startsAt: STARTS_AT,
    endsAt: null,
    endReason: null,
    ...matchOverrides,
    elder: elder ?? {
      id: elderId,
      fullName: fakeElder().fullName,
      status: 'active',
    },
    volunteer: volunteer ?? {
      id: volunteerId,
      firstName: 'Yonatan',
      lastName: 'Bar',
    },
  };
}

export function createMatchPayload(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    elderId: ELDER_A_ID,
    volunteerId: VOLUNTEER_A_ID,
    ...overrides,
  };
}

export function fakeOneTimeMatch(
  overrides: Partial<Match> & {
    elder?: Pick<Elder, 'id' | 'fullName' | 'status'>;
    volunteer?: Pick<User, 'id' | 'firstName' | 'lastName'>;
  } = {}
): Match & {
  elder: Pick<Elder, 'id' | 'fullName' | 'status'>;
  volunteer: Pick<User, 'id' | 'firstName' | 'lastName'>;
} {
  return fakeMatch({
    id: MATCH_ONE_TIME_ID,
    type: 'one_time',
    dayId: DAY_A_ID,
    startsAt: DAY_DATE,
    createdAt: new Date('2026-11-01T09:00:00.000Z'),
    updatedAt: new Date('2026-11-01T09:00:00.000Z'),
    ...overrides,
  });
}

export function createOneTimeMatchPayload(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    elderId: ELDER_A_ID,
    volunteerId: VOLUNTEER_A_ID,
    ...overrides,
  };
}
