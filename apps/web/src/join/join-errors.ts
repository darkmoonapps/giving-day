import type { TFunction } from 'i18next';
import { ApiError } from '../api/mutator';

export const JOIN_ERROR_KEYS = [
  'cities.invalid_join_token',
  'cities.membership_paused',
  'cities.already_member',
  'auth.not_onboarded',
] as const;

export type JoinErrorKey = (typeof JOIN_ERROR_KEYS)[number];

export function isJoinErrorKey(value: string): value is JoinErrorKey {
  return (JOIN_ERROR_KEYS as readonly string[]).includes(value);
}

export function joinErrorKeyFromUnknown(
  error: unknown
): JoinErrorKey | 'join_unexpected_error' {
  if (error instanceof ApiError) {
    if (error.code !== null && isJoinErrorKey(error.code)) {
      return error.code;
    }

    if (error.status === 404) {
      return 'cities.invalid_join_token';
    }

    if (error.status === 409) {
      return 'cities.already_member';
    }
  }

  return 'join_unexpected_error';
}

export function joinErrorMessage(t: TFunction<'auth'>, error: unknown): string {
  const key = joinErrorKeyFromUnknown(error);
  if (key === 'auth.not_onboarded') {
    return t('not_onboarded');
  }

  return t(key);
}

export function cityDisplayName(
  city: { cityNameHe: string; cityNameEn: string },
  language: string
): string {
  return language === 'en' ? city.cityNameEn : city.cityNameHe;
}
