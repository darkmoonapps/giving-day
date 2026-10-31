import { DEFAULT_THEME, mergeMantineTheme } from '@mantine/core';
import { describe, expect, it } from 'vitest';
import { appTheme } from './app-theme';
import {
  mint,
  renderedDarkBadges,
  renderedLightBadges,
  themeTokens,
  wisteria,
} from './colors';
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

  it('points light badges at CSS variables so both schemes pick up tokens', () => {
    expect(resolvedLightBadge('mint')).toEqual({
      color: 'var(--mantine-color-mint-light-color)',
      background: 'var(--mantine-color-mint-light)',
    });
    expect(resolvedLightBadge('red')).toEqual({
      color: 'var(--mantine-color-red-light-color)',
      background: 'var(--mantine-color-red-light)',
    });
  });

  it('meets WCAG AA for the light badges Mantine actually renders', () => {
    expect(renderedLightBadges.mint.color).toBe(mint[7]);
    expect(renderedLightBadges.mint.color).not.toBe(mint[6]);

    expect(
      meetsWcagAaText(
        renderedLightBadges.mint.color,
        renderedLightBadges.mint.background
      )
    ).toBe(true);
    expect(
      meetsWcagAaText(
        renderedLightBadges.red.color,
        renderedLightBadges.red.background
      )
    ).toBe(true);
    expect(
      contrastRatio(
        renderedLightBadges.mint.color,
        renderedLightBadges.mint.background
      )
    ).toBeGreaterThan(contrastRatio(mint[6], mint[1]));
  });

  it('meets WCAG AA for dark-theme mint and danger badges', () => {
    expect(
      meetsWcagAaText(
        renderedDarkBadges.mint.color,
        renderedDarkBadges.mint.background
      )
    ).toBe(true);
    expect(
      meetsWcagAaText(
        renderedDarkBadges.red.color,
        renderedDarkBadges.red.background
      )
    ).toBe(true);
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
