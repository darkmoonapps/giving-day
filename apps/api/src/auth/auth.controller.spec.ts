import { describe, expect, it, vi, afterEach } from 'vitest';
import type { Request, Response } from 'express';
import type { User } from '@prisma/client';
import { AuthController } from './auth.controller';
import type { AuthService } from './auth.service';
import { REFRESH_TOKEN_COOKIE_NAME } from './refresh-token-cookie';

type GoogleCallbackRequest = Request & { user: User };

const HOSTED_FRONTEND = 'https://giving-day.pages.dev';
const HOSTED_API = 'https://giving-day-api.onrender.com';

const envKeys = ['NODE_ENV', 'FRONTEND_URL', 'API_URL'] as const;

const previousEnv: Record<(typeof envKeys)[number], string | undefined> = {
  NODE_ENV: process.env.NODE_ENV,
  FRONTEND_URL: process.env.FRONTEND_URL,
  API_URL: process.env.API_URL,
};

afterEach(() => {
  for (const key of envKeys) {
    const value = previousEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

function setHostedEnv(): void {
  process.env.NODE_ENV = 'production';
  process.env.FRONTEND_URL = HOSTED_FRONTEND;
  process.env.API_URL = HOSTED_API;
}

function createController(): {
  controller: AuthController;
  authService: Pick<AuthService, 'createSession'>;
} {
  const authService = {
    createSession: vi.fn().mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      sessionId: 'session-id',
    }),
  };
  const controller = new AuthController(authService as unknown as AuthService);
  return { controller, authService };
}

function createResponse(): Pick<Response, 'cookie' | 'redirect'> {
  return {
    cookie: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
  };
}

function createRequest(
  user: Pick<User, 'id' | 'onboardedAt'>
): GoogleCallbackRequest {
  return {
    user,
    headers: { 'user-agent': 'Mozilla/5.0 test' },
  } as GoogleCallbackRequest;
}

describe('AuthController Google callback cookies', () => {
  it('sets a cross-site httpOnly cookie and sends new users to onboarding', async () => {
    setHostedEnv();
    const { controller, authService } = createController();
    const res = createResponse();
    const req = createRequest({ id: 'user-1', onboardedAt: null });

    await controller.googleCallback(req, res as Response);

    expect(authService.createSession).toHaveBeenCalledWith(
      'user-1',
      'Mozilla/5.0 test'
    );
    expect(res.cookie).toHaveBeenCalledWith(
      REFRESH_TOKEN_COOKIE_NAME,
      'session-id.refresh-token',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
      })
    );
    expect(res.redirect).toHaveBeenCalledWith(`${HOSTED_FRONTEND}/onboarding`);
  });

  it('sends onboarded users to the frontend auth callback', async () => {
    setHostedEnv();
    const { controller } = createController();
    const res = createResponse();
    const req = createRequest({
      id: 'user-2',
      onboardedAt: new Date('2026-10-28T08:00:00.000Z'),
    });

    await controller.googleCallback(req, res as Response);

    expect(res.redirect).toHaveBeenCalledWith(
      `${HOSTED_FRONTEND}/auth/callback`
    );
  });
});
