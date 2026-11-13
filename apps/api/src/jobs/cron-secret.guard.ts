import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

function readBearerToken(authorization: string): string | null {
  const trimmed = authorization.trim();
  if (trimmed.length < 8) {
    return null;
  }

  const scheme = trimmed.slice(0, 6);
  if (scheme.toLowerCase() !== 'bearer') {
    return null;
  }

  // Require a single separating space (no \s+ backtracking).
  if (trimmed.charAt(6) !== ' ') {
    return null;
  }

  const token = trimmed.slice(7).trim();
  return token.length > 0 ? token : null;
}

function readProvidedSecret(request: Request): string | null {
  const authorization = request.headers.authorization;
  if (typeof authorization === 'string') {
    const bearerToken = readBearerToken(authorization);
    if (bearerToken !== null) {
      return bearerToken;
    }
  }

  const header = request.headers['x-cron-secret'];
  if (typeof header === 'string' && header.trim().length > 0) {
    return header.trim();
  }
  if (Array.isArray(header) && typeof header[0] === 'string') {
    const value = header[0].trim();
    return value.length > 0 ? value : null;
  }

  return null;
}

function secretsMatch(expected: string, provided: string): boolean {
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const providedBuffer = Buffer.from(provided, 'utf8');
  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

@Injectable()
export class CronSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.CRON_SECRET?.trim() ?? '';
    if (expected.length === 0) {
      throw new ServiceUnavailableException('jobs.cron_secret_unconfigured');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided = readProvidedSecret(request);
    if (provided === null || !secretsMatch(expected, provided)) {
      throw new UnauthorizedException('jobs.unauthorized');
    }

    return true;
  }
}
