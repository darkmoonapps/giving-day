import { subject } from '@casl/ability';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type {
  Action,
  AppAbility,
  AppSubjects,
  UserWithMemberships,
} from '../abilities/ability.factory';

export type CityOwnedSubject =
  | 'CitySettings'
  | 'CityInvite'
  | 'CityMembership'
  | 'DistributionDay'
  | 'DayParticipation';

export function assertCanOnCity(
  ability: AppAbility,
  action: Action,
  type: CityOwnedSubject,
  cityId: string,
  extra: Record<string, unknown> = {}
): void {
  // CASL matches on condition fields only; Prisma subject types require a
  // full model so we assert the partial city-scoped object.
  const instance = subject(type, { cityId, ...extra }) as AppSubjects;
  if (ability.cannot(action, instance)) {
    throw new NotFoundException('cities.not_found');
  }
}

export function isActiveVolunteerInCity(
  actor: UserWithMemberships,
  cityId: string
): boolean {
  return actor.memberships.some(
    (membership) =>
      membership.cityId === cityId &&
      membership.role === 'volunteer' &&
      membership.status === 'active'
  );
}

export function assertActiveVolunteerInCity(
  actor: UserWithMemberships,
  cityId: string
): void {
  if (!isActiveVolunteerInCity(actor, cityId)) {
    throw new ForbiddenException('auth.insufficient_permissions');
  }
}
