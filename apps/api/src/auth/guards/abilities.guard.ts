import { subject } from '@casl/ability';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AbilityFactory,
  type AppSubjects,
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

    const request = context.switchToHttp().getRequest<{
      user?: UserWithMemberships;
      params?: { cityId?: string };
    }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('auth.unauthenticated');
    }

    const ability = this.abilityFactory.createForUser(user);
    const cityId = request.params?.cityId;

    for (const requiredAbility of requiredAbilities) {
      const { action, subject: subjectType, conditions } = requiredAbility;

      if (!ability.can(action, subjectType)) {
        throw new ForbiddenException('auth.insufficient_permissions');
      }

      if (cityId && typeof subjectType === 'string' && subjectType !== 'all') {
        const instance = subject(subjectType, {
          cityId,
          ...conditions,
        }) as AppSubjects;
        if (ability.cannot(action, instance)) {
          throw new NotFoundException('cities.not_found');
        }
      }
    }

    return true;
  }
}
