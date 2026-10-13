import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithMantine } from '../test/render';
import { HealthStatusCard } from './health-status-card';

const healthyProps = {
  title: 'System Status',
  loadingLabel: 'Checking API health...',
  errorTitle: 'Error',
  errorMessage: null,
  apiStatusLabel: 'API Status:',
  databaseLabel: 'Database:',
  apiStatusValue: 'Healthy',
  databaseValue: 'Connected',
  lastCheckedLabel: 'Last checked:',
  lastCheckedValue: '15/01/2026, 10:00',
  detailsToggleLabel: 'Hide details',
  isLoading: false,
  detailsOpen: true,
  onToggleDetails: (): void => undefined,
  status: 'healthy' as const,
  databaseConnected: true,
};

describe('HealthStatusCard', () => {
  it('shows healthy API and database status', () => {
    renderWithMantine(<HealthStatusCard {...healthyProps} />);

    expect(screen.getByText('Healthy')).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText(/Last checked:/)).toBeInTheDocument();
  });

  it('shows a loading state', () => {
    renderWithMantine(
      <HealthStatusCard
        {...healthyProps}
        isLoading
        status={null}
        databaseConnected={null}
      />
    );

    expect(screen.getByText('Checking API health...')).toBeInTheDocument();
  });

  it('toggles details when requested', async () => {
    const onToggleDetails = vi.fn();
    const user = userEvent.setup();

    renderWithMantine(
      <HealthStatusCard {...healthyProps} onToggleDetails={onToggleDetails} />
    );

    await user.click(screen.getByRole('button', { name: 'Hide details' }));
    expect(onToggleDetails).toHaveBeenCalledOnce();
  });
});
