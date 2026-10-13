import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import App from './App';

// TODO: Add i18n provider (react-i18next) once frontend-foundations PR lands

const renderApp = () => {
  return render(
    <MantineProvider>
      <App />
    </MantineProvider>
  );
};

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('renders the main title', () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    renderApp();

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise(() => {
          // Never resolves - keeps loading
        })
    );

    renderApp();

    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('displays healthy status when API responds', async () => {
    const mockHealthResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
      },
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockHealthResponse,
    } as Response);

    renderApp();

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
  });

  it('displays unhealthy status when database is disconnected', async () => {
    const mockHealthResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
      },
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockHealthResponse,
    } as Response);

    renderApp();

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

  it('displays error when API fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    renderApp();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/HTTP 500/);
    });
  });

  it('polls health endpoint every 30 seconds', async () => {
    vi.useFakeTimers();

    const mockHealthResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
      },
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockHealthResponse,
    } as Response);

    renderApp();

    await vi.runOnlyPendingTimersAsync();
    const initialCalls = vi.mocked(fetch).mock.calls.length;
    expect(initialCalls).toBeGreaterThanOrEqual(1);

    await vi.advanceTimersByTimeAsync(30000);
    expect(fetch).toHaveBeenCalledTimes(initialCalls + 1);

    await vi.advanceTimersByTimeAsync(30000);
    expect(fetch).toHaveBeenCalledTimes(initialCalls + 2);
  });
});
