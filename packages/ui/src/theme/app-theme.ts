import {
  createTheme,
  type CSSVariablesResolver,
  type MantineTheme,
} from '@mantine/core';
import { COLOR_SCHEME_STORAGE_KEY } from '@giving-day/shared';
import {
  mint,
  plum,
  renderedDarkBadges,
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
    '--giving-day-success': theme.other.brand.mint,
    '--giving-day-delivered': theme.other.brand.mint,
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
    '--giving-day-body': themeTokens.light.body,
    '--giving-day-paper': themeTokens.light.paper,
    '--giving-day-text': themeTokens.light.text,
    '--giving-day-success-bg': themeTokens.light.successBackground,
    '--giving-day-success-text': themeTokens.light.successText,
  },
  dark: {
    '--mantine-color-body': themeTokens.dark.body,
    '--mantine-color-text': themeTokens.dark.text,
    '--mantine-color-dimmed': themeTokens.dark.dimmed,
    '--mantine-color-default': themeTokens.dark.paper,
    '--mantine-color-default-hover': theme.colors.dark[6],
    '--mantine-color-default-border': theme.colors.dark[4],
    '--mantine-color-anchor': theme.colors.wisteria[3],
    '--mantine-color-mint-light': renderedDarkBadges.mint.background,
    '--mantine-color-mint-light-color': renderedDarkBadges.mint.color,
    '--mantine-color-red-light': renderedDarkBadges.red.background,
    '--mantine-color-red-light-color': renderedDarkBadges.red.color,
    '--giving-day-body': themeTokens.dark.body,
    '--giving-day-paper': themeTokens.dark.paper,
    '--giving-day-text': themeTokens.dark.text,
    '--giving-day-success-bg': themeTokens.dark.successBackground,
    '--giving-day-success-text': themeTokens.dark.successText,
  },
});
