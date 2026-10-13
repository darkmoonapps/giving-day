import { z } from 'zod';

export const colorSchemePreferenceSchema = z.enum(['auto', 'light', 'dark']);

export type ColorSchemePreference = z.infer<typeof colorSchemePreferenceSchema>;
