import {
  ServiceUnavailableException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import { afterEach, describe, expect, it } from 'vitest';
import { CronSecretGuard } from './cron-secret.guard';

function createContext(headers: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as ExecutionContext;
}

describe('CronSecretGuard', () => {
  const previous = process.env.CRON_SECRET;

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = previous;
    }
  });

  it('rejects when CRON_SECRET is not configured', () => {
    delete process.env.CRON_SECRET;
    const guard = new CronSecretGuard();

    expect(() =>
      guard.canActivate(createContext({ authorization: 'Bearer anything' }))
    ).toThrow(ServiceUnavailableException);
  });

  it('accepts a matching Bearer token', () => {
    process.env.CRON_SECRET = 'holon-cron-test-secret';
    const guard = new CronSecretGuard();

    expect(
      guard.canActivate(
        createContext({ authorization: 'Bearer holon-cron-test-secret' })
      )
    ).toBe(true);
  });

  it('accepts a matching x-cron-secret header', () => {
    process.env.CRON_SECRET = 'holon-cron-test-secret';
    const guard = new CronSecretGuard();

    expect(
      guard.canActivate(
        createContext({ 'x-cron-secret': 'holon-cron-test-secret' })
      )
    ).toBe(true);
  });

  it('rejects a wrong secret', () => {
    process.env.CRON_SECRET = 'holon-cron-test-secret';
    const guard = new CronSecretGuard();

    expect(() =>
      guard.canActivate(
        createContext({ authorization: 'Bearer wrong-secret-value' })
      )
    ).toThrow(UnauthorizedException);
  });
});
