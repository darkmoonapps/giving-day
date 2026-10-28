import { SetMetadata } from '@nestjs/common';
import type { Action, AppSubjects } from '../../abilities/ability.factory';

export interface RequiredAbility {
  action: Action;
  subject: AppSubjects;
  conditions?: Record<string, unknown>;
}

export const ABILITIES_KEY = 'abilities';
export const RequireAbilities = (
  ...abilities: RequiredAbility[]
): ReturnType<typeof SetMetadata> => SetMetadata(ABILITIES_KEY, abilities);
