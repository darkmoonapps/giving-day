import { Container, Group, Text } from '@mantine/core';
import type { ReactNode } from 'react';

export interface AppHeaderProps {
  title: string;
  actions?: ReactNode;
}

export function AppHeader({ title, actions }: AppHeaderProps): JSX.Element {
  return (
    <Container
      h="100%"
      style={{ display: 'flex', alignItems: 'center', width: '100%' }}
    >
      <Group justify="space-between" w="100%" wrap="nowrap">
        <Text component="p" fw={700} size="lg" m={0} data-testid="app-brand">
          {title}
        </Text>
        {actions}
      </Group>
    </Container>
  );
}
