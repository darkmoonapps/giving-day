import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { i18n } from './i18n';
import { renderWithProviders } from './test/render';

const healthyPayload = {
  status: 'healthy',
  timestamp: '2026-01-15T10:00:00.000Z',
  database: { connected: true },
};

describe('App', () => {
  afterEach(async () => {
    vi.unstubAllGlobals();
    await i18n.changeLanguage('he');
  });

  it('renders the Hebrew home copy by default', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => healthyPayload,
      })
    );

    renderWithProviders(<App />);

    expect(
      await screen.findByRole('heading', { name: 'ברוכים הבאים ליום הנתינה' })
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'שפה' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'ערכת צבע' })).toBeInTheDocument();
    expect(await screen.findByText('תקין')).toBeInTheDocument();
  });

  it('switches visible copy from Hebrew to English', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => healthyPayload,
      })
    );

    const user = userEvent.setup();
    renderWithProviders(<App />);

    await screen.findByRole('heading', { name: 'ברוכים הבאים ליום הנתינה' });
    await user.click(screen.getByRole('button', { name: 'English' }));

    expect(
      await screen.findByRole('heading', { name: 'Welcome to Giving Day' })
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Language' })).toBeInTheDocument();
  });
});
