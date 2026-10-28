import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createAuthFetchMock,
  fakeUser,
  FAKE_ACCESS_TOKEN,
} from '../test/auth-fixtures';
import { clearAccessToken, getAccessToken } from './access-token';
import {
  completeOnboarding,
  getCurrentUser,
  logoutSession,
  refreshSession,
} from './auth-api';

describe('auth API wrappers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    clearAccessToken();
  });

  it('stores the access token from a cookie refresh', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(createAuthFetchMock({ refresh: 'ok', user: fakeUser() }))
    );

    await expect(refreshSession()).resolves.toBe(FAKE_ACCESS_TOKEN);
    expect(getAccessToken()).toBe(FAKE_ACCESS_TOKEN);
  });

  it('parses the current user from /api/auth/me', async () => {
    const user = fakeUser({ onboardedAt: '2026-10-28T08:00:00.000Z' });
    vi.stubGlobal('fetch', vi.fn(createAuthFetchMock({ refresh: 'ok', user })));

    await refreshSession();
    await expect(getCurrentUser()).resolves.toMatchObject({
      firstName: 'Noa',
      lastName: 'Cohen',
      email: 'noa.cohen@example.test',
    });
  });

  it('posts onboarding fields without email', async () => {
    const user = fakeUser();
    const fetchMock = vi.fn(createAuthFetchMock({ refresh: 'ok', user }));
    vi.stubGlobal('fetch', fetchMock);
    await refreshSession();

    await completeOnboarding({
      firstName: 'Noa',
      lastName: 'Cohen',
      phone: '+972501234567',
      birthDate: '1990-03-15',
      locale: 'he',
    });

    const onboardingCall = fetchMock.mock.calls.find((call) =>
      String(call[0]).includes('/api/auth/onboarding')
    );
    expect(onboardingCall).toBeDefined();
    const body = JSON.parse(String(onboardingCall?.[1]?.body)) as Record<
      string,
      unknown
    >;
    expect(body).toEqual({
      firstName: 'Noa',
      lastName: 'Cohen',
      phone: '+972501234567',
      birthDate: '1990-03-15',
      locale: 'he',
    });
    expect(body).not.toHaveProperty('email');
  });

  it('clears the access token on logout', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(createAuthFetchMock({ refresh: 'ok', user: fakeUser() }))
    );
    await refreshSession();
    await logoutSession();
    expect(getAccessToken()).toBeNull();
  });

  it('still clears the access token when the logout API fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createAuthFetchMock({
          refresh: 'ok',
          user: fakeUser(),
          logout: 'error',
        })
      )
    );
    await refreshSession();
    await expect(logoutSession()).resolves.toBeUndefined();
    expect(getAccessToken()).toBeNull();
  });
});
