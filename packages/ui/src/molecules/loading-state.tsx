import { Group } from '@mantine/core';
import { AppLoader, AppText } from '../atoms';

export interface LoadingStateProps {
  label: string;
}

export function LoadingState({ label }: LoadingStateProps): JSX.Element {
  return (
    <Group>
      <AppLoader size="sm" />
      <AppText>{label}</AppText>
    </Group>
  );
}
