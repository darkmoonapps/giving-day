import { Group } from '@mantine/core';
import type { ReactNode } from 'react';
import { AppBadge, AppText } from '../atoms';

export interface LabeledStatusProps {
  label: string;
  value: string;
  color: string;
  icon?: ReactNode;
  testId?: string;
  dataStatus?: string;
  dataConnected?: string;
}

export function LabeledStatus({
  label,
  value,
  color,
  icon,
  testId,
  dataStatus,
  dataConnected,
}: LabeledStatusProps): JSX.Element {
  return (
    <Group>
      <AppText fw={500}>{label}</AppText>
      <AppBadge
        color={color}
        variant="light"
        leftSection={icon}
        data-testid={testId}
        data-status={dataStatus}
        data-connected={dataConnected}
      >
        {value}
      </AppBadge>
    </Group>
  );
}
