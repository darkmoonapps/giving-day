import { describe, expect, it } from 'vitest';
import { themeTokens, wisteria } from './colors';
import { contrastRatio, meetsWcagAaText, meetsWcagAaUi } from './contrast';

describe('Wisteria & mint contrast', () => {
  it('meets WCAG AA for light-theme body and dimmed text', () => {
    expect(
      meetsWcagAaText(themeTokens.light.text, themeTokens.light.body)
    ).toBe(true);
    expect(
      meetsWcagAaText(themeTokens.light.dimmed, themeTokens.light.body)
    ).toBe(true);
  });

  it('meets WCAG AA for light-theme primary buttons and mint success', () => {
    expect(
      meetsWcagAaText(
        themeTokens.light.primaryFilledText,
        themeTokens.light.primaryFilled
      )
    ).toBe(true);
    expect(
      meetsWcagAaText(
        themeTokens.light.successText,
        themeTokens.light.successBackground
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
