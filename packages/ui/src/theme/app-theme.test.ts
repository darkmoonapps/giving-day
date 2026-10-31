import { DEFAULT_THEME, mergeMantineTheme } from '@mantine/core';
import { describe, expect, it } from 'vitest';
import { appTheme, cssVariablesResolver } from './app-theme';
import {
  PLUM_BACKGROUND,
  renderedDarkBadges,
  renderedLightBadges,
  themeTokens,
} from './colors';

const theme = mergeMantineTheme(DEFAULT_THEME, appTheme);

describe('cssVariablesResolver', () => {
  it('exposes brand and semantic tokens for both color schemes', () => {
    const variables = cssVariablesResolver(theme);

    expect(variables.variables).toMatchObject({
      '--giving-day-wisteria': '#A99BE0',
      '--giving-day-mint': '#A8E6CF',
      '--giving-day-plum': PLUM_BACKGROUND,
      '--giving-day-success': '#A8E6CF',
      '--giving-day-delivered': '#A8E6CF',
    });
    expect(variables.light).toMatchObject({
      '--mantine-color-body': themeTokens.light.body,
      '--mantine-color-mint-light': renderedLightBadges.mint.background,
      '--giving-day-success-bg': themeTokens.light.successBackground,
    });
    expect(variables.dark).toMatchObject({
      '--mantine-color-body': PLUM_BACKGROUND,
      '--mantine-color-mint-light': renderedDarkBadges.mint.background,
      '--giving-day-success-bg': themeTokens.dark.successBackground,
    });
  });
});
