import { z } from 'zod';

export const languageCodeSchema = z.enum(['he', 'en']);

export type LanguageCode = z.infer<typeof languageCodeSchema>;

export const DIRECTION_BY_LANGUAGE = {
  he: 'rtl',
  en: 'ltr',
} as const satisfies Record<LanguageCode, 'rtl' | 'ltr'>;

export function isLanguageCode(value: string): value is LanguageCode {
  return languageCodeSchema.safeParse(value).success;
}

export function getDirection(language: LanguageCode): 'rtl' | 'ltr' {
  return DIRECTION_BY_LANGUAGE[language];
}

export function parseLanguageCode(
  value: string | undefined,
  fallback: LanguageCode = 'he'
): LanguageCode {
  if (value === undefined) {
    return fallback;
  }

  const parsed = languageCodeSchema.safeParse(value);
  return parsed.success ? parsed.data : fallback;
}
