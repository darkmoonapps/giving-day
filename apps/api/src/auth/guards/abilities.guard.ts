import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AbilityFactory,
  type UserWithMemberships,
} from '../../abilities/ability.factory';
import {
  ABILITIES_KEY,
  type RequiredAbility,
} from '../decorators/require-abilities.decorator';

@Injectable()
export class AbilitiesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly abilityFactory: AbilityFactory
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredAbilities = this.reflector.getAllAndOverride<
      RequiredAbility[]
    >(ABILITIES_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredAbilities) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as UserWithMemberships;

    if (!user) {
      throw new ForbiddenException('auth.unauthenticated');
    }

    const ability = this.abilityFactory.createForUser(user);

    const hasAllAbilities = requiredAbilities.every((requiredAbility) => {
      const { action, subject } = requiredAbility;
      return ability.can(action, subject);
    });

    if (!hasAllAbilities) {
      throw new ForbiddenException('auth.insufficient_permissions');
    }

    return true;
  }
}
