import { Card } from '@mantine/core';
import { AppText } from '@giving-day/ui';

export interface StatCardProps {
  testId: string;
  label: string;
  value: number;
  color?: string;
}

export function StatCard({
  testId,
  label,
  value,
  color,
}: StatCardProps): JSX.Element {
  return (
    <Card
      padding="md"
      radius="md"
      withBorder
      role="group"
      data-testid={testId}
      aria-label={`${label}: ${value}`}
      style={
        color === undefined
          ? undefined
          : {
              borderInlineStartWidth: 4,
              borderInlineStartColor: `var(--mantine-color-${color}-4)`,
            }
      }
    >
      <AppText size="sm" c="dimmed">
        {label}
      </AppText>
      <AppText size="xl" fw={700} mt={4} data-testid={`${testId}-value`}>
        {value}
      </AppText>
    </Card>
  );
}
