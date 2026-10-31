import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import * as pwaInstall from '../auth/pwa-install';
import { i18n } from '../i18n';
import { renderWithProviders } from '../test/render';
import { JoinInstallButton } from './join-install-button';

describe('JoinInstallButton', () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    await i18n.changeLanguage('he');
  });

  it('prompts the captured PWA install event', async () => {
    vi.spyOn(pwaInstall, 'isStandaloneDisplay').mockReturnValue(false);
    vi.spyOn(pwaInstall, 'canPromptInstall').mockReturnValue(true);
    const promptInstall = vi
      .spyOn(pwaInstall, 'promptInstall')
      .mockResolvedValue('accepted');
    const user = userEvent.setup();

    renderWithProviders(
      <MemoryRouter>
        <JoinInstallButton />
      </MemoryRouter>
    );

    await user.click(screen.getByTestId('install-app'));
    expect(promptInstall).toHaveBeenCalledOnce();
  });

  it('shows iOS add-to-home-screen help when no prompt is available', async () => {
    vi.spyOn(pwaInstall, 'isStandaloneDisplay').mockReturnValue(false);
    vi.spyOn(pwaInstall, 'canPromptInstall').mockReturnValue(false);
    vi.spyOn(pwaInstall, 'shouldShowIosInstallHelp').mockReturnValue(true);
    const user = userEvent.setup();

    renderWithProviders(
      <MemoryRouter>
        <JoinInstallButton />
      </MemoryRouter>
    );

    await user.click(screen.getByTestId('install-app'));
    expect(screen.getByTestId('install-ios-help')).toBeInTheDocument();
  });

  it('hides the button when the app is already installed', () => {
    vi.spyOn(pwaInstall, 'isStandaloneDisplay').mockReturnValue(true);

    renderWithProviders(
      <MemoryRouter>
        <JoinInstallButton />
      </MemoryRouter>
    );

    expect(screen.queryByTestId('install-app')).not.toBeInTheDocument();
  });
});
