import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clearAccessToken } from '../auth/access-token';
import * as oauth from '../auth/oauth';
import { i18n } from '../i18n';
import {
  clearPersistedJoinToken,
  readPersistedJoinToken,
} from '../join/join-token-storage';
import { fakeUser } from '../test/auth-fixtures';
import {
  FAKE_JOIN_TOKEN,
  createJoinFetchMock,
  holonRedeemResponse,
  onboardedJoinUser,
} from '../test/join-fixtures';
import { renderApp } from '../test/render';

describe('JoinPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createJoinFetchMock({
          auth: { refresh: 'unauthorized' },
        })
      )
    );
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    clearAccessToken();
    clearPersistedJoinToken();
    await i18n.changeLanguage('he');
  });

  it('shows the Holon landing page with Install app and Google login', async () => {
    renderApp(`/join/${FAKE_JOIN_TOKEN}`);

    expect(
      await screen.findByRole('heading', { name: 'הצטרפות לחולון' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('join-page')).toBeInTheDocument();
    expect(screen.getByText('הוזמנתם להתנדב בחולון.')).toBeInTheDocument();
    expect(screen.getByTestId('install-app')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'המשך עם Google' })
    ).toBeInTheDocument();
    expect(readPersistedJoinToken()).toBe(FAKE_JOIN_TOKEN);
  });

  it('switches Holon join copy to English', async () => {
    const user = userEvent.setup();
    renderApp(`/join/${FAKE_JOIN_TOKEN}`);

    await screen.findByRole('heading', { name: 'הצטרפות לחולון' });
    await user.click(screen.getByRole('button', { name: 'English' }));

    expect(
      await screen.findByRole('heading', { name: 'Join Holon' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('You have been invited to volunteer in Holon.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Install app' })
    ).toBeInTheDocument();
  });

  it('shows an invalid state for a revoked token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createJoinFetchMock({
          auth: { refresh: 'unauthorized' },
          preview: 'not_found',
        })
      )
    );

    renderApp(`/join/${FAKE_JOIN_TOKEN}`);

    expect(await screen.findByTestId('join-invalid')).toBeInTheDocument();
    expect(
      screen.getByText('קישור ההצטרפות הזה אינו תקף או שבוטל.')
    ).toBeInTheDocument();
  });

  it('sends a first-time user through onboarding while keeping the token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createJoinFetchMock({
          auth: {
            refresh: 'ok',
            user: fakeUser({ onboardedAt: null }),
          },
        })
      )
    );

    renderApp(`/join/${FAKE_JOIN_TOKEN}`);

    expect(await screen.findByTestId('onboarding-page')).toBeInTheDocument();
    expect(screen.queryByTestId('join-page')).not.toBeInTheDocument();
    expect(readPersistedJoinToken()).toBe(FAKE_JOIN_TOKEN);
  });

  it('redeems a valid token and shows waiting for coordinator approval', async () => {
    const fetchMock = vi.fn(
      createJoinFetchMock({
        auth: { refresh: 'ok', user: onboardedJoinUser() },
        redeem: holonRedeemResponse('pending'),
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    renderApp(`/join/${FAKE_JOIN_TOKEN}`);

    expect(await screen.findByTestId('join-waiting')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'ממתינים לאישור הרכזת' })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/בקשתכם להצטרף לחולון ממתינה לאישור הרכזת/)
    ).toBeInTheDocument();

    const redeemCall = fetchMock.mock.calls.find(
      (call) =>
        String(call[0]).includes('/api/join') && call[1]?.method === 'POST'
    );
    expect(redeemCall).toBeDefined();
    expect(JSON.parse(String(redeemCall?.[1]?.body))).toEqual({
      token: FAKE_JOIN_TOKEN,
    });
  });

  it('shows an already-pending membership without creating another request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createJoinFetchMock({
          auth: { refresh: 'ok', user: onboardedJoinUser() },
          redeem: holonRedeemResponse('already_pending'),
        })
      )
    );

    renderApp(`/join/${FAKE_JOIN_TOKEN}`);

    expect(
      await screen.findByTestId('join-already-pending')
    ).toBeInTheDocument();
    expect(screen.getByText(/כבר ביקשתם להצטרף לחולון/)).toBeInTheDocument();
  });

  it('shows that the visitor is already a city member', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createJoinFetchMock({
          auth: { refresh: 'ok', user: onboardedJoinUser() },
          redeem: holonRedeemResponse('already_active'),
        })
      )
    );

    renderApp(`/join/${FAKE_JOIN_TOKEN}`);

    expect(
      await screen.findByTestId('join-already-member')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'לעמוד הבית' })
    ).toBeInTheDocument();
  });

  it('shows a rejected-then-reapplied waiting state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createJoinFetchMock({
          auth: { refresh: 'ok', user: onboardedJoinUser() },
          redeem: holonRedeemResponse('rejected'),
        })
      )
    );

    renderApp(`/join/${FAKE_JOIN_TOKEN}`);

    expect(await screen.findByTestId('join-rejected')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'הבקשה הקודמת לא אושרה' })
    ).toBeInTheDocument();
  });

  it('shows the paused membership error from the API key', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createJoinFetchMock({
          auth: { refresh: 'ok', user: onboardedJoinUser() },
          redeem: 'paused',
        })
      )
    );

    renderApp(`/join/${FAKE_JOIN_TOKEN}`);

    expect(await screen.findByTestId('join-paused')).toBeInTheDocument();
    expect(
      screen.getByText('החברות שלכם בעיר הזו מושהית. פנו לרכזת כדי לחזור.')
    ).toBeInTheDocument();
  });

  it('returns to the join page after mandatory onboarding', async () => {
    const fetchMock = vi.fn(
      createJoinFetchMock({
        auth: {
          refresh: 'ok',
          user: fakeUser({
            firstName: null,
            lastName: null,
            phone: null,
            email: null,
            onboardedAt: null,
          }),
        },
        redeem: holonRedeemResponse('pending'),
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('Notification', {
      requestPermission: vi.fn().mockResolvedValue('granted'),
    });
    const user = userEvent.setup();

    renderApp(`/join/${FAKE_JOIN_TOKEN}`);
    await screen.findByTestId('onboarding-page');

    await user.type(screen.getByLabelText(/שם פרטי/), 'Noa');
    await user.type(screen.getByLabelText(/שם משפחה/), 'Cohen');
    await user.type(screen.getByLabelText(/מספר טלפון/), '050-1234567');
    await user.click(screen.getByRole('button', { name: 'שמירה והמשך' }));

    await waitFor(() => {
      expect(screen.getByTestId('join-waiting')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('home-page')).not.toBeInTheDocument();
  });

  it('starts Google login from the join landing without leaving the token behind', async () => {
    const startOAuthLogin = vi
      .spyOn(oauth, 'startOAuthLogin')
      .mockImplementation(() => undefined);
    const user = userEvent.setup();

    renderApp(`/join/${FAKE_JOIN_TOKEN}`);
    await user.click(
      await screen.findByRole('button', { name: 'המשך עם Google' })
    );

    expect(startOAuthLogin).toHaveBeenCalledWith('google');
    expect(readPersistedJoinToken()).toBe(FAKE_JOIN_TOKEN);
  });
});
