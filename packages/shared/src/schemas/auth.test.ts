import { describe, expect, it } from 'vitest';
import {
  authUserSchema,
  birthDateInputValue,
  e164PhoneSchema,
  getUserDisplayName,
  isUserOnboarded,
  meResponseSchema,
  onboardingFormSchema,
  refreshTokenResponseSchema,
  toOnboardingRequest,
} from './auth';

const fakeUser = {
  id: '11111111-1111-4111-8111-111111111111',
  firstName: 'Noa',
  lastName: 'Cohen',
  phone: '+972501234567',
  email: 'noa.cohen@example.test',
  birthDate: '1990-03-15T00:00:00.000Z',
  locale: 'he' as const,
  onboardedAt: '2026-10-28T08:00:00.000Z',
};

describe('e164PhoneSchema', () => {
  it('accepts an international Israeli mobile number', () => {
    expect(e164PhoneSchema.parse('+972501234567')).toBe('+972501234567');
  });

  it('rejects a local number without a country code', () => {
    expect(e164PhoneSchema.safeParse('0501234567').success).toBe(false);
  });
});

describe('onboardingFormSchema', () => {
  it('accepts required fields and optional blank email and birth date', () => {
    const parsed = onboardingFormSchema.parse({
      firstName: ' Noa ',
      lastName: 'Cohen',
      phone: '+972501234567',
      birthDate: '',
      email: '',
      locale: 'he',
    });

    expect(parsed.firstName).toBe('Noa');
    expect(parsed.email).toBe('');
  });

  it('rejects a missing first name', () => {
    const result = onboardingFormSchema.safeParse({
      firstName: '   ',
      lastName: 'Cohen',
      phone: '+972501234567',
      locale: 'en',
    });

    expect(result.success).toBe(false);
  });

  it('rejects an invalid email when one is provided', () => {
    const result = onboardingFormSchema.safeParse({
      firstName: 'Noa',
      lastName: 'Cohen',
      phone: '+972501234567',
      email: 'not-an-email',
      locale: 'he',
    });

    expect(result.success).toBe(false);
  });
});

describe('toOnboardingRequest', () => {
  it('omits blank optional fields and does not send email', () => {
    expect(
      toOnboardingRequest({
        firstName: 'Noa',
        lastName: 'Cohen',
        phone: '+972501234567',
        birthDate: '',
        email: 'noa.cohen@example.test',
        locale: 'en',
      })
    ).toEqual({
      firstName: 'Noa',
      lastName: 'Cohen',
      phone: '+972501234567',
      locale: 'en',
    });
  });

  it('includes a birth date when provided', () => {
    expect(
      toOnboardingRequest({
        firstName: 'Noa',
        lastName: 'Cohen',
        phone: '+972501234567',
        birthDate: '1990-03-15',
        locale: 'he',
      }).birthDate
    ).toBe('1990-03-15');
  });
});

describe('auth user helpers', () => {
  it('parses a /me payload with fake demo data', () => {
    const parsed = meResponseSchema.parse({ user: fakeUser });
    expect(parsed.user.email).toBe('noa.cohen@example.test');
    expect(isUserOnboarded(parsed.user)).toBe(true);
    expect(getUserDisplayName(parsed.user)).toBe('Noa Cohen');
    expect(birthDateInputValue(parsed.user.birthDate)).toBe('1990-03-15');
  });

  it('treats a null onboardedAt as not onboarded', () => {
    const user = authUserSchema.parse({
      ...fakeUser,
      onboardedAt: null,
    });
    expect(isUserOnboarded(user)).toBe(false);
  });

  it('parses a refresh token response', () => {
    expect(
      refreshTokenResponseSchema.parse({ accessToken: 'header.payload.sig' })
        .accessToken
    ).toBe('header.payload.sig');
  });
});
