import { describe, expect, it } from 'vitest';
import { getDirection, isLanguageCode, parseLanguageCode } from './language';

describe('language schemas', () => {
  it('maps Hebrew to RTL and English to LTR', () => {
    expect(getDirection('he')).toBe('rtl');
    expect(getDirection('en')).toBe('ltr');
  });

  it('parses known language codes and falls back to Hebrew', () => {
    expect(parseLanguageCode('en')).toBe('en');
    expect(parseLanguageCode('he')).toBe('he');
    expect(parseLanguageCode('fr')).toBe('he');
    expect(parseLanguageCode(undefined)).toBe('he');
  });

  it('narrows valid language codes', () => {
    expect(isLanguageCode('he')).toBe(true);
    expect(isLanguageCode('en')).toBe(true);
    expect(isLanguageCode('es')).toBe(false);
  });
});
