import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import App from './App';

const renderApp = () => {
  return render(
    <MantineProvider>
      <App />
    </MantineProvider>
  );
};

describe('App', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('renders the main title', () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    renderApp();

    expect(screen.getByText('Giving Day')).toBeInTheDocument();
    expect(screen.getByText('Welcome to Giving Day')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise(() => {
          // Never resolves - keeps loading
        })
    );

    renderApp();

    expect(screen.getByText('Checking API health...')).toBeInTheDocument();
  });

  it('displays health status when API responds', async () => {
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
      expect(screen.getByText('healthy')).toBeInTheDocument();
    });

    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('displays error when API fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    renderApp();

    await waitFor(() => {
      expect(screen.getByText(/HTTP 500/)).toBeInTheDocument();
    });
  });
});
