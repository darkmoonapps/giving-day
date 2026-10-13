import { AppShell, Container } from '@mantine/core';
import type { ReactNode } from 'react';

export interface AppPageShellProps {
  header: ReactNode;
  children: ReactNode;
}

export function AppPageShell({
  header,
  children,
}: AppPageShellProps): JSX.Element {
  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>{header}</AppShell.Header>
      <AppShell.Main>
        <Container size="sm" py="xl">
          {children}
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
