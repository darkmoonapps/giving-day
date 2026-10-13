import { Group } from '@mantine/core';
import type { ReactNode } from 'react';
import { AppBadge, AppText } from '../atoms';

export interface LabeledStatusProps {
  label: string;
  value: string;
  color: string;
  icon?: ReactNode;
}

export function LabeledStatus({
  label,
  value,
  color,
  icon,
}: LabeledStatusProps): JSX.Element {
  return (
    <Group>
      <AppText fw={500}>{label}</AppText>
      <AppBadge color={color} variant="light" leftSection={icon}>
        {value}
      </AppBadge>
    </Group>
  );
}
