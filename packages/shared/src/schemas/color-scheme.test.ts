import { describe, expect, it } from 'vitest';
import {
  COLOR_SCHEME_STORAGE_KEY,
  colorSchemePreferenceSchema,
} from './color-scheme';

describe('colorSchemePreferenceSchema', () => {
  it('accepts auto, light, and dark', () => {
    expect(colorSchemePreferenceSchema.parse('auto')).toBe('auto');
    expect(colorSchemePreferenceSchema.parse('light')).toBe('light');
    expect(colorSchemePreferenceSchema.parse('dark')).toBe('dark');
  });

  it('exposes the persisted color-scheme storage key', () => {
    expect(COLOR_SCHEME_STORAGE_KEY).toBe('giving-day-ui');
  });

  it('rejects unknown schemes', () => {
    expect(colorSchemePreferenceSchema.safeParse('sepia').success).toBe(false);
  });
});
