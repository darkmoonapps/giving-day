import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { clearAccessToken } from '../auth/access-token';
import * as oauth from '../auth/oauth';
import { SessionProvider } from '../auth/session-provider';
import { i18n } from '../i18n';
import { createAuthFetchMock } from '../test/auth-fixtures';
import { renderWithProviders } from '../test/render';
import { LoginPage } from './login-page';

describe('LoginPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(createAuthFetchMock({ refresh: 'unauthorized' }))
    );
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    clearAccessToken();
    await i18n.changeLanguage('he');
  });

  it('starts Google and Facebook OAuth from the login buttons', async () => {
    const startOAuthLogin = vi
      .spyOn(oauth, 'startOAuthLogin')
      .mockImplementation(() => undefined);
    const user = userEvent.setup();

    renderWithProviders(
      <MemoryRouter>
        <SessionProvider>
          <LoginPage />
        </SessionProvider>
      </MemoryRouter>
    );

    await screen.findByTestId('login-page');
    await user.click(screen.getByRole('button', { name: 'המשך עם Google' }));
    await user.click(screen.getByRole('button', { name: 'המשך עם Facebook' }));

    expect(startOAuthLogin).toHaveBeenCalledWith('google');
    expect(startOAuthLogin).toHaveBeenCalledWith('facebook');
  });
});
