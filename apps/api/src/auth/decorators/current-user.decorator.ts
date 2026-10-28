import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UserWithMemberships } from '../../abilities/ability.factory';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserWithMemberships => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as UserWithMemberships;
  }
);
