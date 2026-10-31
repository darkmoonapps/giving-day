import { describe, expect, it } from 'vitest';
import { ApiError } from '../api/mutator';
import { i18n } from '../i18n';
import {
  cityDisplayName,
  isJoinErrorKey,
  joinErrorKeyFromUnknown,
  joinErrorMessage,
} from './join-errors';

describe('join error mapping', () => {
  it('recognizes the volunteer-facing join error keys from the API', () => {
    expect(isJoinErrorKey('cities.invalid_join_token')).toBe(true);
    expect(isJoinErrorKey('cities.membership_paused')).toBe(true);
    expect(isJoinErrorKey('cities.already_member')).toBe(true);
    expect(isJoinErrorKey('auth.not_onboarded')).toBe(true);
    expect(isJoinErrorKey('cities.already_coordinator')).toBe(false);
  });

  it('maps NestJS status and codes to join error keys', () => {
    expect(
      joinErrorKeyFromUnknown(
        new ApiError(
          404,
          'cities.invalid_join_token',
          'cities.invalid_join_token'
        )
      )
    ).toBe('cities.invalid_join_token');
    expect(
      joinErrorKeyFromUnknown(
        new ApiError(
          409,
          'cities.membership_paused',
          'cities.membership_paused'
        )
      )
    ).toBe('cities.membership_paused');
    expect(joinErrorKeyFromUnknown(new ApiError(404, 'HTTP 404'))).toBe(
      'cities.invalid_join_token'
    );
    expect(joinErrorKeyFromUnknown(new ApiError(500, 'HTTP 500'))).toBe(
      'join_unexpected_error'
    );
  });

  it('translates Holon names and API error keys in both languages', () => {
    const city = { cityNameHe: 'חולון', cityNameEn: 'Holon' };
    expect(cityDisplayName(city, 'he')).toBe('חולון');
    expect(cityDisplayName(city, 'en')).toBe('Holon');

    expect(
      joinErrorMessage(
        i18n.getFixedT('en', 'auth'),
        new ApiError(
          404,
          'cities.invalid_join_token',
          'cities.invalid_join_token'
        )
      )
    ).toBe('This join link is invalid or has been revoked.');
    expect(
      joinErrorMessage(
        i18n.getFixedT('he', 'auth'),
        new ApiError(
          409,
          'cities.membership_paused',
          'cities.membership_paused'
        )
      )
    ).toBe('החברות שלכם בעיר הזו מושהית. פנו לרכזת כדי לחזור.');
  });
});
