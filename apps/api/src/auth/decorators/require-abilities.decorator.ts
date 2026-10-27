import { SetMetadata } from '@nestjs/common';

export interface RequiredAbility {
  action: string;
  subject: string;
  conditions?: Record<string, unknown>;
}

export const ABILITIES_KEY = 'abilities';
export const RequireAbilities = (
  ...abilities: RequiredAbility[]
): ReturnType<typeof SetMetadata> => SetMetadata(ABILITIES_KEY, abilities);
