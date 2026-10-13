import {
  createTheme,
  type CSSVariablesResolver,
  type MantineTheme,
} from '@mantine/core';
import { mint, plum, themeTokens, wisteria } from './colors';

export const COLOR_SCHEME_STORAGE_KEY = 'giving-day-ui';

export const appTheme = createTheme({
  primaryColor: 'wisteria',
  colors: {
    wisteria,
    mint,
    dark: plum,
  },
  primaryShade: { light: 6, dark: 6 },
  defaultRadius: 'md',
  cursorType: 'pointer',
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  headings: {
    fontFamily:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  white: themeTokens.light.paper,
  black: themeTokens.light.text,
  other: {
    brand: {
      wisteria: wisteria[4],
      mint: mint[3],
      plum: plum[8],
    },
    semantic: {
      success: 'mint',
      delivered: 'mint',
    },
  },
});

export const cssVariablesResolver: CSSVariablesResolver = (
  theme: MantineTheme
) => ({
  variables: {
    '--giving-day-wisteria': theme.other.brand.wisteria,
    '--giving-day-mint': theme.other.brand.mint,
    '--giving-day-plum': theme.other.brand.plum,
  },
  light: {
    '--mantine-color-body': themeTokens.light.body,
    '--mantine-color-text': themeTokens.light.text,
    '--mantine-color-dimmed': themeTokens.light.dimmed,
    '--mantine-color-default': themeTokens.light.paper,
    '--mantine-color-anchor': theme.colors.wisteria[7],
  },
  dark: {
    '--mantine-color-body': themeTokens.dark.body,
    '--mantine-color-text': themeTokens.dark.text,
    '--mantine-color-dimmed': themeTokens.dark.dimmed,
    '--mantine-color-default': themeTokens.dark.paper,
    '--mantine-color-default-hover': theme.colors.dark[6],
    '--mantine-color-default-border': theme.colors.dark[4],
    '--mantine-color-anchor': theme.colors.wisteria[3],
  },
});
