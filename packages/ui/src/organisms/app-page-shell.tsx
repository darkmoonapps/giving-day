import { AppShell, Container } from '@mantine/core';
import type { ReactNode } from 'react';
import './app-page-shell.css';

export const MAIN_CONTENT_ID = 'main-content';

export interface AppPageShellProps {
  header: ReactNode;
  children: ReactNode;
  skipToContentLabel?: string;
  mainContentId?: string;
}

export function AppPageShell({
  header,
  children,
  skipToContentLabel,
  mainContentId = MAIN_CONTENT_ID,
}: AppPageShellProps): JSX.Element {
  return (
    <AppShell header={{ height: 60 }} padding="md">
      {skipToContentLabel !== undefined ? (
        <a className="gd-skip-link" href={`#${mainContentId}`}>
          {skipToContentLabel}
        </a>
      ) : null}
      <AppShell.Header>{header}</AppShell.Header>
      <AppShell.Main id={mainContentId} tabIndex={-1}>
        <Container size="sm" py="xl">
          {children}
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
