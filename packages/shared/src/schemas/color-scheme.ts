import { z } from 'zod';

export const COLOR_SCHEME_STORAGE_KEY = 'giving-day-ui';

export const colorSchemePreferenceSchema = z.enum(['auto', 'light', 'dark']);

export type ColorSchemePreference = z.infer<typeof colorSchemePreferenceSchema>;
