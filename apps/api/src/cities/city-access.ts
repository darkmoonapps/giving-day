import { subject } from '@casl/ability';
import { NotFoundException } from '@nestjs/common';
import type {
  Action,
  AppAbility,
  AppSubjects,
} from '../abilities/ability.factory';

export type CityOwnedSubject = 'CitySettings' | 'CityInvite' | 'CityMembership';

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
