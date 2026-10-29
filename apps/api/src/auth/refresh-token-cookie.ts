import type { CookieOptions } from 'express';

export const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';

const REFRESH_TOKEN_COOKIE_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
const DEFAULT_FRONTEND_URL = 'http://localhost:3000';
const DEFAULT_API_URL = 'http://localhost:3001';

export interface RefreshTokenCookieEnv {
  NODE_ENV?: string;
  FRONTEND_URL?: string;
  API_URL?: string;
}

export type RefreshTokenCookieSameSite = 'lax' | 'none';

export interface RefreshTokenCookieOptions extends CookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: RefreshTokenCookieSameSite;
  path: '/';
  maxAge: number;
}

export type RefreshTokenClearCookieOptions = Omit<
  RefreshTokenCookieOptions,
  'maxAge'
>;

/**
 * Schemeful same-site check: different hostnames or protocols are cross-site.
 * Ports are ignored so local Vite (3000) and the API (3001) stay Lax.
 */
export function areCrossSiteOrigins(
  frontendUrl: string,
  apiUrl: string
): boolean {
  try {
    const frontend = new URL(frontendUrl);
    const api = new URL(apiUrl);
    return (
      frontend.protocol !== api.protocol || frontend.hostname !== api.hostname
    );
  } catch {
    return false;
  }
}

export function getRefreshTokenCookieOptions(
  env: RefreshTokenCookieEnv = process.env
): RefreshTokenCookieOptions {
  const isProduction = env.NODE_ENV === 'production';
  const crossSite = areCrossSiteOrigins(
    env.FRONTEND_URL || DEFAULT_FRONTEND_URL,
    env.API_URL || DEFAULT_API_URL
  );
  const sameSite: RefreshTokenCookieSameSite =
    isProduction || crossSite ? 'none' : 'lax';

  return {
    httpOnly: true,
    secure: isProduction || sameSite === 'none',
    sameSite,
    path: '/',
    maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE_MS,
  };
}

export function getRefreshTokenClearCookieOptions(
  env: RefreshTokenCookieEnv = process.env
): RefreshTokenClearCookieOptions {
  const options = getRefreshTokenCookieOptions(env);
  return {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
  };
}

export function buildRefreshTokenCookieValue(
  sessionId: string,
  refreshToken: string
): string {
  return `${sessionId}.${refreshToken}`;
}

export function parseRefreshTokenCookie(cookieValue: string): {
  sessionId: string;
  refreshToken: string;
} {
  const parts = cookieValue.split('.');
  if (parts.length < 2) {
    return { sessionId: '', refreshToken: '' };
  }
  const sessionId = parts[0];
  const refreshToken = parts.slice(1).join('.');
  return { sessionId, refreshToken };
}
