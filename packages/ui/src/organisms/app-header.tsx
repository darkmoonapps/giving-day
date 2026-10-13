import { Container, Group } from '@mantine/core';
import type { ReactNode } from 'react';
import { AppTitle } from '../atoms';

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
        <AppTitle order={2}>{title}</AppTitle>
        {actions}
      </Group>
    </Container>
  );
}
