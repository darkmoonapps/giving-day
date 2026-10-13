import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { i18n } from './i18n';
import { renderWithProviders } from './test/render';

const healthyPayload = {
  status: 'healthy',
  timestamp: '2026-01-15T10:00:00.000Z',
  database: { connected: true },
};

const mockJsonResponse = (payload: unknown): Response =>
  ({
    ok: true,
    status: 200,
    json: async () => payload,
  }) as Response;

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    await i18n.changeLanguage('he');
  });

  it('renders the Hebrew home copy by default', async () => {
    vi.mocked(fetch).mockResolvedValue(mockJsonResponse(healthyPayload));

    renderWithProviders(<App />);

    expect(
      await screen.findByRole('heading', { name: 'ברוכים הבאים ליום הנתינה' })
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'שפה' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'ערכת צבע' })).toBeInTheDocument();
  });

  it('displays the loading state initially', () => {
    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise(() => {
          return;
        })
    );

    renderWithProviders(<App />);

    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    expect(screen.getByText('בודק את תקינות ה-API...')).toBeInTheDocument();
  });

  it('displays healthy status when the API responds', async () => {
    vi.mocked(fetch).mockResolvedValue(mockJsonResponse(healthyPayload));

    renderWithProviders(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('status-badge')).toHaveAttribute(
        'data-status',
        'healthy'
      );
    });

    expect(screen.getByTestId('database-badge')).toHaveAttribute(
      'data-connected',
      'true'
    );
    expect(screen.getByText('תקין')).toBeInTheDocument();
  });

  it('displays unhealthy status when the database is disconnected', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockJsonResponse({
        status: 'unhealthy',
        timestamp: '2026-01-15T10:00:00.000Z',
        database: { connected: false },
      })
    );

    renderWithProviders(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('status-badge')).toHaveAttribute(
        'data-status',
        'unhealthy'
      );
    });

    expect(screen.getByTestId('database-badge')).toHaveAttribute(
      'data-connected',
      'false'
    );
  });

  it('displays a translated error when the API fails', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    renderWithProviders(<App />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('שגיאת HTTP 500');
    });
  });

  it('switches visible copy from Hebrew to English', async () => {
    vi.mocked(fetch).mockResolvedValue(mockJsonResponse(healthyPayload));
    const user = userEvent.setup();

    renderWithProviders(<App />);

    await screen.findByRole('heading', { name: 'ברוכים הבאים ליום הנתינה' });
    await user.click(screen.getByRole('button', { name: 'English' }));

    expect(
      await screen.findByRole('heading', { name: 'Welcome to Giving Day' })
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Language' })).toBeInTheDocument();
  });

  it('polls the health endpoint every 30 seconds', async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockResolvedValue(mockJsonResponse(healthyPayload));

    renderWithProviders(<App />);

    await vi.runOnlyPendingTimersAsync();
    const initialCalls = vi.mocked(fetch).mock.calls.length;
    expect(initialCalls).toBeGreaterThanOrEqual(1);

    await vi.advanceTimersByTimeAsync(30000);
    expect(fetch).toHaveBeenCalledTimes(initialCalls + 1);

    await vi.advanceTimersByTimeAsync(30000);
    expect(fetch).toHaveBeenCalledTimes(initialCalls + 2);
  });
});
