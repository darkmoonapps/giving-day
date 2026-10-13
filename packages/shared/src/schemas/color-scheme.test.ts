import { describe, expect, it } from 'vitest';
import { colorSchemePreferenceSchema } from './color-scheme';

describe('colorSchemePreferenceSchema', () => {
  it('accepts auto, light, and dark', () => {
    expect(colorSchemePreferenceSchema.parse('auto')).toBe('auto');
    expect(colorSchemePreferenceSchema.parse('light')).toBe('light');
    expect(colorSchemePreferenceSchema.parse('dark')).toBe('dark');
  });

  it('rejects unknown schemes', () => {
    expect(colorSchemePreferenceSchema.safeParse('sepia').success).toBe(false);
  });
});
