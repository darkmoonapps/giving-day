import {
  DirectionProvider,
  MantineProvider,
  type MantineColorScheme,
} from '@mantine/core';
import type { ReactNode } from 'react';
import { appTheme, cssVariablesResolver } from './app-theme';

export interface AppThemeProviderProps {
  children: ReactNode;
  defaultColorScheme?: MantineColorScheme;
  forceColorScheme?: 'light' | 'dark';
  initialDirection?: 'rtl' | 'ltr';
}

export function AppThemeProvider({
  children,
  defaultColorScheme = 'auto',
  forceColorScheme,
  initialDirection = 'rtl',
}: AppThemeProviderProps): JSX.Element {
  return (
    <DirectionProvider
      initialDirection={initialDirection}
      detectDirection={false}
    >
      <MantineProvider
        theme={appTheme}
        defaultColorScheme={defaultColorScheme}
        forceColorScheme={forceColorScheme}
        cssVariablesResolver={cssVariablesResolver}
      >
        {children}
      </MantineProvider>
    </DirectionProvider>
  );
}
