import type { Meta, StoryObj } from '@storybook/react';
import { HealthStatusCard } from './health-status-card';

const meta: Meta<typeof HealthStatusCard> = {
  title: 'Organisms/HealthStatusCard',
  component: HealthStatusCard,
};

export default meta;

type Story = StoryObj<typeof HealthStatusCard>;

export const Healthy: Story = {
  args: {
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
    onToggleDetails: () => undefined,
    status: 'healthy',
    databaseConnected: true,
  },
};

export const Loading: Story = {
  args: {
    ...Healthy.args,
    isLoading: true,
    status: null,
    databaseConnected: null,
    apiStatusValue: null,
    databaseValue: null,
    lastCheckedValue: null,
  },
};

export const ErrorState: Story = {
  args: {
    ...Healthy.args,
    errorMessage: 'Failed to fetch health',
    status: null,
    databaseConnected: null,
  },
};
