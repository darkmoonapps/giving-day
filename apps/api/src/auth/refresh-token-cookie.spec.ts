import { describe, expect, it } from 'vitest';
import {
  areCrossSiteOrigins,
  buildRefreshTokenCookieValue,
  getRefreshTokenClearCookieOptions,
  getRefreshTokenCookieOptions,
  parseRefreshTokenCookie,
  REFRESH_TOKEN_COOKIE_NAME,
} from './refresh-token-cookie';

describe('areCrossSiteOrigins', () => {
  it('treats local Vite and API ports as same-site', () => {
    expect(
      areCrossSiteOrigins('http://localhost:3000', 'http://localhost:3001')
    ).toBe(false);
  });

  it('detects the hosted Pages and Render hosts as cross-site', () => {
    expect(
      areCrossSiteOrigins(
        'https://giving-day.pages.dev',
        'https://giving-day-api.onrender.com'
      )
    ).toBe(true);
  });

  it('treats http vs https on the same host as cross-site', () => {
    expect(
      areCrossSiteOrigins('https://localhost:3000', 'http://localhost:3001')
    ).toBe(true);
  });

  it('returns false for invalid URLs', () => {
    expect(areCrossSiteOrigins('not-a-url', 'http://localhost:3001')).toBe(
      false
    );
  });
});

describe('getRefreshTokenCookieOptions', () => {
  it('keeps SameSite=Lax on local same-site HTTP', () => {
    const options = getRefreshTokenCookieOptions({
      NODE_ENV: 'development',
      FRONTEND_URL: 'http://localhost:3000',
      API_URL: 'http://localhost:3001',
    });

    expect(options).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
    });
    expect(options.maxAge).toBe(90 * 24 * 60 * 60 * 1000);
  });

  it('uses SameSite=None; Secure for hosted Pages to Render', () => {
    const options = getRefreshTokenCookieOptions({
      NODE_ENV: 'production',
      FRONTEND_URL: 'https://giving-day.pages.dev',
      API_URL: 'https://giving-day-api.onrender.com',
    });

    expect(options).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 90 * 24 * 60 * 60 * 1000,
    });
  });

  it('uses SameSite=None; Secure in production even if URLs look local', () => {
    const options = getRefreshTokenCookieOptions({
      NODE_ENV: 'production',
      FRONTEND_URL: 'http://localhost:3000',
      API_URL: 'http://localhost:3001',
    });

    expect(options.sameSite).toBe('none');
    expect(options.secure).toBe(true);
    expect(options.httpOnly).toBe(true);
  });

  it('uses SameSite=None; Secure for cross-site URLs outside production', () => {
    const options = getRefreshTokenCookieOptions({
      NODE_ENV: 'development',
      FRONTEND_URL: 'https://giving-day.pages.dev',
      API_URL: 'https://giving-day-api.onrender.com',
    });

    expect(options.sameSite).toBe('none');
    expect(options.secure).toBe(true);
  });
});

describe('getRefreshTokenClearCookieOptions', () => {
  it('matches the set-cookie flags without maxAge', () => {
    const env = {
      NODE_ENV: 'production',
      FRONTEND_URL: 'https://giving-day.pages.dev',
      API_URL: 'https://giving-day-api.onrender.com',
    };

    expect(getRefreshTokenClearCookieOptions(env)).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
    });
  });
});

describe('refresh token cookie value', () => {
  it('round-trips session id and token, including dots in the token', () => {
    const cookieValue = buildRefreshTokenCookieValue(
      'session-id',
      'raw.refresh.token'
    );

    expect(REFRESH_TOKEN_COOKIE_NAME).toBe('refreshToken');
    expect(parseRefreshTokenCookie(cookieValue)).toEqual({
      sessionId: 'session-id',
      refreshToken: 'raw.refresh.token',
    });
  });

  it('returns empty parts when the cookie is missing a token', () => {
    expect(parseRefreshTokenCookie('')).toEqual({
      sessionId: '',
      refreshToken: '',
    });
    expect(parseRefreshTokenCookie('only-session')).toEqual({
      sessionId: '',
      refreshToken: '',
    });
  });
});
