import { Card, Stack } from '@mantine/core';
import { IconAlertCircle, IconCircleCheck } from '@tabler/icons-react';
import type { HealthStatus } from '@giving-day/shared';
import { AppAlert, AppButton, AppText, AppTitle } from '../atoms';
import { LabeledStatus, LoadingState } from '../molecules';

export interface HealthStatusCardProps {
  title: string;
  loadingLabel: string;
  errorTitle: string;
  errorMessage: string | null;
  apiStatusLabel: string;
  databaseLabel: string;
  apiStatusValue: string | null;
  databaseValue: string | null;
  lastCheckedLabel: string;
  lastCheckedValue: string | null;
  detailsToggleLabel: string;
  isLoading: boolean;
  detailsOpen: boolean;
  onToggleDetails: () => void;
  status: HealthStatus | null;
  databaseConnected: boolean | null;
}

function statusColor(
  status: HealthStatus | null,
  connected: boolean | null
): string {
  if (status === 'healthy' || connected === true) {
    return 'mint';
  }

  return 'red';
}

export function HealthStatusCard({
  title,
  loadingLabel,
  errorTitle,
  errorMessage,
  apiStatusLabel,
  databaseLabel,
  apiStatusValue,
  databaseValue,
  lastCheckedLabel,
  lastCheckedValue,
  detailsToggleLabel,
  isLoading,
  detailsOpen,
  onToggleDetails,
  status,
  databaseConnected,
}: HealthStatusCardProps): JSX.Element {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <AppTitle order={3} mb="md">
        {title}
      </AppTitle>

      {isLoading && <LoadingState label={loadingLabel} />}

      {errorMessage !== null && (
        <AppAlert
          icon={<IconAlertCircle size={16} />}
          title={errorTitle}
          color="red"
        >
          {errorMessage}
        </AppAlert>
      )}

      {status !== null && errorMessage === null && (
        <Stack gap="md">
          <LabeledStatus
            label={apiStatusLabel}
            value={apiStatusValue ?? status}
            color={statusColor(status, null)}
            icon={<IconCircleCheck size={12} />}
            testId="status-badge"
            dataStatus={status}
          />
          <LabeledStatus
            label={databaseLabel}
            value={databaseValue ?? ''}
            color={statusColor(null, databaseConnected)}
            testId="database-badge"
            dataConnected={
              databaseConnected === null ? undefined : String(databaseConnected)
            }
          />
          <AppButton
            variant="subtle"
            size="compact-sm"
            onClick={onToggleDetails}
          >
            {detailsToggleLabel}
          </AppButton>
          {detailsOpen && lastCheckedValue !== null && (
            <AppText size="xs" c="dimmed">
              {lastCheckedLabel} {lastCheckedValue}
            </AppText>
          )}
        </Stack>
      )}
    </Card>
  );
}
