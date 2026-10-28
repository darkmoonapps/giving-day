import { SetMetadata } from '@nestjs/common';
import type { Action } from '../../abilities/ability.factory';

export interface RequiredAbility {
  action: Action;
  subject: string;
  conditions?: Record<string, unknown>;
}

export const ABILITIES_KEY = 'abilities';
export const RequireAbilities = (
  ...abilities: RequiredAbility[]
): ReturnType<typeof SetMetadata> => SetMetadata(ABILITIES_KEY, abilities);
