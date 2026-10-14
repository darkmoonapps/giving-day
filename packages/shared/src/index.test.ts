import { describe, expect, it } from 'vitest';
import {
  COLOR_SCHEME_STORAGE_KEY,
  colorSchemePreferenceSchema,
  getDirection,
  healthResponseSchema,
  languageCodeSchema,
} from './index';

describe('shared public exports', () => {
  it('exposes the health, language, and color-scheme contracts', () => {
    expect(
      healthResponseSchema.parse({
        status: 'healthy',
        timestamp: '2026-01-15T10:00:00.000Z',
        database: { connected: true },
      }).status
    ).toBe('healthy');
    expect(languageCodeSchema.parse('he')).toBe('he');
    expect(getDirection('en')).toBe('ltr');
    expect(colorSchemePreferenceSchema.parse('auto')).toBe('auto');
    expect(COLOR_SCHEME_STORAGE_KEY).toBe('giving-day-ui');
  });
});
