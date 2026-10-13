import { DEFAULT_THEME, mergeMantineTheme } from '@mantine/core';
import { describe, expect, it } from 'vitest';
import { appTheme } from './app-theme';
import { mint, renderedLightBadges, themeTokens, wisteria } from './colors';
import { contrastRatio, meetsWcagAaText, meetsWcagAaUi } from './contrast';

const theme = mergeMantineTheme(DEFAULT_THEME, appTheme);

function resolvedLightBadge(color: 'mint' | 'red'): {
  color: string;
  background: string;
} {
  const resolved = theme.variantColorResolver({
    color,
    theme,
    variant: 'light',
  });

  return {
    color: resolved.color,
    background: resolved.background,
  };
}

describe('Wisteria & mint contrast', () => {
  it('meets WCAG AA for light-theme body and dimmed text', () => {
    expect(
      meetsWcagAaText(themeTokens.light.text, themeTokens.light.body)
    ).toBe(true);
    expect(
      meetsWcagAaText(themeTokens.light.dimmed, themeTokens.light.body)
    ).toBe(true);
  });

  it('meets WCAG AA for the light badges Mantine actually renders', () => {
    const mintBadge = resolvedLightBadge('mint');
    const redBadge = resolvedLightBadge('red');

    expect(mintBadge).toEqual(renderedLightBadges.mint);
    expect(redBadge).toEqual(renderedLightBadges.red);
    expect(mintBadge.color).toBe(mint[7]);
    expect(mintBadge.color).not.toBe(mint[6]);

    expect(meetsWcagAaText(mintBadge.color, mintBadge.background)).toBe(true);
    expect(meetsWcagAaText(redBadge.color, redBadge.background)).toBe(true);
    expect(
      contrastRatio(mintBadge.color, mintBadge.background)
    ).toBeGreaterThan(contrastRatio(mint[6], mint[1]));
  });

  it('meets WCAG AA for light-theme primary buttons', () => {
    expect(
      meetsWcagAaText(
        themeTokens.light.primaryFilledText,
        themeTokens.light.primaryFilled
      )
    ).toBe(true);
    expect(
      meetsWcagAaUi(themeTokens.light.primaryFilled, themeTokens.light.body)
    ).toBe(true);
  });

  it('meets WCAG AA for dark-theme body, dimmed text, and accents', () => {
    expect(meetsWcagAaText(themeTokens.dark.text, themeTokens.dark.body)).toBe(
      true
    );
    expect(
      meetsWcagAaText(themeTokens.dark.dimmed, themeTokens.dark.body)
    ).toBe(true);
    expect(
      meetsWcagAaText(
        themeTokens.dark.primaryFilledText,
        themeTokens.dark.primaryFilled
      )
    ).toBe(true);
    expect(
      meetsWcagAaText(
        themeTokens.dark.successText,
        themeTokens.dark.successBackground
      )
    ).toBe(true);
    expect(meetsWcagAaUi(themeTokens.dark.accent, themeTokens.dark.body)).toBe(
      true
    );
    expect(
      meetsWcagAaUi(themeTokens.dark.successAccent, themeTokens.dark.body)
    ).toBe(true);
  });

  it('keeps brand wisteria as a recognizable mid-scale swatch', () => {
    expect(wisteria[4]).toBe('#A99BE0');
    expect(contrastRatio('#FFFFFF', wisteria[6])).toBeGreaterThanOrEqual(4.5);
  });
});
