import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): Promise<boolean> | boolean {
    return super.canActivate(context) as Promise<boolean> | boolean;
  }

  handleRequest<TUser = unknown>(err: Error | null, user: TUser): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('auth.unauthenticated');
    }
    return user;
  }
}
