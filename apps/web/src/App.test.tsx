import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { i18n } from './i18n';
import { clearAccessToken } from './auth/access-token';
import {
  clearPersistedJoinToken,
  persistJoinToken,
} from './join/join-token-storage';
import { createAuthFetchMock, fakeUser } from './test/auth-fixtures';
import {
  FAKE_JOIN_TOKEN,
  createJoinFetchMock,
  holonRedeemResponse,
  onboardedJoinUser,
} from './test/join-fixtures';
import { renderApp } from './test/render';

describe('App routes', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(createAuthFetchMock({ refresh: 'unauthorized' }))
    );
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    clearAccessToken();
    clearPersistedJoinToken();
    await i18n.changeLanguage('he');
  });

  it('renders the Hebrew login screen by default', async () => {
    renderApp('/');

    expect(
      await screen.findByRole('heading', { name: 'התחברות' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'המשך עם Google' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'המשך עם Facebook' })
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'שפה' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'ערכת צבע' })).toBeInTheDocument();
  });

  it('switches visible login copy from Hebrew to English', async () => {
    const user = userEvent.setup();
    renderApp('/login');

    await screen.findByRole('heading', { name: 'התחברות' });
    await user.click(screen.getByRole('button', { name: 'English' }));

    expect(
      await screen.findByRole('heading', { name: 'Sign in' })
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Language' })).toBeInTheDocument();
  });

  it('sends an unauthenticated visitor from home to login', async () => {
    renderApp('/');

    expect(await screen.findByTestId('login-page')).toBeInTheDocument();
  });

  it('sends a first-time user to onboarding', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createAuthFetchMock({
          refresh: 'ok',
          user: fakeUser({ onboardedAt: null }),
        })
      )
    );

    renderApp('/');

    expect(await screen.findByTestId('onboarding-page')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'השלמת פרופיל' })
    ).toBeInTheDocument();
  });

  it('shows the empty home after onboarding is complete', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createAuthFetchMock({
          refresh: 'ok',
          user: fakeUser({ onboardedAt: '2026-10-28T08:00:00.000Z' }),
        })
      )
    );

    renderApp('/');

    expect(await screen.findByTestId('home-page')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'התחברתם בהצלחה' })
    ).toBeInTheDocument();
    expect(screen.getByText('שלום, Noa Cohen.')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'מצב המערכת' })
    ).not.toBeInTheDocument();
  });

  it('finishes OAuth callback into onboarding for a new user', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createAuthFetchMock({
          refresh: 'ok',
          user: fakeUser({ onboardedAt: null }),
        })
      )
    );

    renderApp('/auth/callback');

    expect(await screen.findByTestId('onboarding-page')).toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });

  it('keeps an unauthenticated visitor on the public join landing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createJoinFetchMock({
          auth: { refresh: 'unauthorized' },
        })
      )
    );

    renderApp(`/join/${FAKE_JOIN_TOKEN}`);

    expect(
      await screen.findByRole('heading', { name: 'הצטרפות לחולון' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('join-page')).toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });

  it('returns an onboarded OAuth callback to the stored join link', async () => {
    persistJoinToken(FAKE_JOIN_TOKEN);
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createJoinFetchMock({
          auth: {
            refresh: 'ok',
            user: onboardedJoinUser(),
          },
          redeem: holonRedeemResponse('pending'),
        })
      )
    );

    renderApp('/auth/callback');

    expect(await screen.findByTestId('join-waiting')).toBeInTheDocument();
    expect(screen.queryByTestId('home-page')).not.toBeInTheDocument();
  });

  it('finishes OAuth callback into home for an onboarded user', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createAuthFetchMock({
          refresh: 'ok',
          user: fakeUser({ onboardedAt: '2026-10-28T08:00:00.000Z' }),
        })
      )
    );

    renderApp('/auth/callback');

    expect(await screen.findByTestId('home-page')).toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });

  it('returns to login when OAuth callback refresh is unauthorized', async () => {
    renderApp('/auth/callback');

    expect(await screen.findByTestId('login-page')).toBeInTheDocument();
    expect(screen.queryByTestId('onboarding-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('home-page')).not.toBeInTheDocument();
  });

  it('logs out from the empty home back to login', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createAuthFetchMock({
          refresh: 'ok',
          user: fakeUser({ onboardedAt: '2026-10-28T08:00:00.000Z' }),
        })
      )
    );
    const user = userEvent.setup();

    renderApp('/');
    await screen.findByTestId('home-page');
    await user.click(screen.getByRole('button', { name: 'התנתקות' }));

    expect(await screen.findByTestId('login-page')).toBeInTheDocument();
  });

  it('returns to login when the logout API call fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createAuthFetchMock({
          refresh: 'ok',
          user: fakeUser({ onboardedAt: '2026-10-28T08:00:00.000Z' }),
          logout: 'error',
        })
      )
    );
    const user = userEvent.setup();

    renderApp('/');
    await screen.findByTestId('home-page');
    await user.click(screen.getByRole('button', { name: 'התנתקות' }));

    expect(await screen.findByTestId('login-page')).toBeInTheDocument();
    expect(screen.queryByTestId('home-page')).not.toBeInTheDocument();
  });
});

describe('onboarding form', () => {
  afterEach(async () => {
    vi.unstubAllGlobals();
    clearAccessToken();
    clearPersistedJoinToken();
    await i18n.changeLanguage('he');
  });

  it('requires first name, last name, and an E.164 phone', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createAuthFetchMock({
          refresh: 'ok',
          user: fakeUser({
            firstName: null,
            lastName: null,
            phone: null,
            email: null,
            onboardedAt: null,
          }),
        })
      )
    );
    const user = userEvent.setup();

    renderApp('/onboarding');
    await screen.findByTestId('onboarding-page');
    await user.click(screen.getByRole('button', { name: 'שמירה והמשך' }));

    expect(await screen.findAllByText('שדה חובה')).toHaveLength(3);
  });

  it('submits profile fields then opens the empty home', async () => {
    const fetchMock = vi.fn(
      createAuthFetchMock({
        refresh: 'ok',
        user: fakeUser({
          firstName: null,
          lastName: null,
          phone: null,
          email: 'noa.cohen@example.test',
          birthDate: null,
          onboardedAt: null,
        }),
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('Notification', {
      requestPermission: vi.fn().mockResolvedValue('granted'),
    });
    const user = userEvent.setup();

    renderApp('/onboarding');
    await screen.findByTestId('onboarding-page');

    await user.type(screen.getByLabelText(/שם פרטי/), 'Noa');
    await user.type(screen.getByLabelText(/שם משפחה/), 'Cohen');
    await user.type(screen.getByLabelText(/מספר טלפון/), '050-1234567');
    expect(screen.getByLabelText(/אימייל/)).toHaveAttribute('readonly');
    await user.click(screen.getByRole('button', { name: 'שמירה והמשך' }));

    await waitFor(() => {
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });

    const onboardingCall = fetchMock.mock.calls.find((call) =>
      String(call[0]).includes('/api/auth/onboarding')
    );
    expect(onboardingCall).toBeDefined();
    const body = JSON.parse(String(onboardingCall?.[1]?.body)) as Record<
      string,
      unknown
    >;
    expect(body).toMatchObject({
      firstName: 'Noa',
      lastName: 'Cohen',
      phone: '+972501234567',
      locale: 'he',
    });
    expect(body).not.toHaveProperty('email');
    expect(body).not.toHaveProperty('birthDate');
  });

  it('submits an optional birth date then opens the empty home', async () => {
    const fetchMock = vi.fn(
      createAuthFetchMock({
        refresh: 'ok',
        user: fakeUser({
          firstName: null,
          lastName: null,
          phone: null,
          email: null,
          birthDate: null,
          onboardedAt: null,
        }),
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('Notification', {
      requestPermission: vi.fn().mockResolvedValue('granted'),
    });
    const user = userEvent.setup();

    renderApp('/onboarding');
    await screen.findByTestId('onboarding-page');

    await user.type(screen.getByLabelText(/שם פרטי/), 'Noa');
    await user.type(screen.getByLabelText(/שם משפחה/), 'Cohen');
    await user.type(screen.getByLabelText(/מספר טלפון/), '050-1234567');
    fireEvent.change(screen.getByLabelText(/תאריך לידה/), {
      target: { value: '1990-03-15' },
    });
    await user.click(screen.getByRole('button', { name: 'שמירה והמשך' }));

    await waitFor(() => {
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });

    const onboardingCall = fetchMock.mock.calls.find((call) =>
      String(call[0]).includes('/api/auth/onboarding')
    );
    expect(onboardingCall).toBeDefined();
    const body = JSON.parse(String(onboardingCall?.[1]?.body)) as Record<
      string,
      unknown
    >;
    expect(body).toMatchObject({
      firstName: 'Noa',
      lastName: 'Cohen',
      phone: '+972501234567',
      birthDate: '1990-03-15',
      locale: 'he',
    });
  });

  it('shows an onboarding error when the API rejects the save', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createAuthFetchMock({
          refresh: 'ok',
          user: fakeUser({
            firstName: null,
            lastName: null,
            phone: null,
            onboardedAt: null,
          }),
          onboardingUser: 'error',
        })
      )
    );
    vi.stubGlobal('Notification', {
      requestPermission: vi.fn().mockResolvedValue('granted'),
    });
    const user = userEvent.setup();

    renderApp('/onboarding');
    await screen.findByTestId('onboarding-page');

    await user.type(screen.getByLabelText(/שם פרטי/), 'Noa');
    await user.type(screen.getByLabelText(/שם משפחה/), 'Cohen');
    await user.type(screen.getByLabelText(/מספר טלפון/), '050-1234567');
    await user.click(screen.getByRole('button', { name: 'שמירה והמשך' }));

    expect(await screen.findByTestId('onboarding-error')).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-page')).toBeInTheDocument();
    expect(screen.queryByTestId('home-page')).not.toBeInTheDocument();
  });

  it('hides email when the OAuth profile did not provide one', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createAuthFetchMock({
          refresh: 'ok',
          user: fakeUser({
            firstName: null,
            lastName: null,
            phone: null,
            email: null,
            onboardedAt: null,
          }),
        })
      )
    );

    renderApp('/onboarding');
    await screen.findByTestId('onboarding-page');

    expect(screen.queryByLabelText(/אימייל/)).not.toBeInTheDocument();
  });
});
