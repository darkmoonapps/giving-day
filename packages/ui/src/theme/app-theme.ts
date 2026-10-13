import {
  createTheme,
  type CSSVariablesResolver,
  type MantineTheme,
} from '@mantine/core';
import { COLOR_SCHEME_STORAGE_KEY } from '@giving-day/shared';
import {
  mint,
  plum,
  renderedLightBadges,
  themeTokens,
  wisteria,
} from './colors';
import { variantColorResolver } from './variant-colors';

export { COLOR_SCHEME_STORAGE_KEY };

export const appTheme = createTheme({
  primaryColor: 'wisteria',
  colors: {
    wisteria,
    mint,
    dark: plum,
  },
  variantColorResolver,
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
    '--mantine-color-mint-light': renderedLightBadges.mint.background,
    '--mantine-color-mint-light-color': renderedLightBadges.mint.color,
    '--mantine-color-red-light': renderedLightBadges.red.background,
    '--mantine-color-red-light-color': renderedLightBadges.red.color,
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
