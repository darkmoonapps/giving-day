import {
  DirectionProvider,
  MantineProvider,
  type MantineColorScheme,
} from '@mantine/core';
import {
  CITY_DEFAULT_THEME,
  GIVING_DAY_THEME_ATTRIBUTE,
} from '@giving-day/shared';
import { useEffect, type ReactNode } from 'react';
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
  useEffect(() => {
    document.documentElement.setAttribute(
      GIVING_DAY_THEME_ATTRIBUTE,
      CITY_DEFAULT_THEME
    );
  }, []);

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
