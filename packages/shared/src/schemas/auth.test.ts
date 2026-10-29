import { describe, expect, it } from 'vitest';
import {
  authUserSchema,
  birthDateInputValue,
  e164PhoneSchema,
  getUserDisplayName,
  isUserOnboarded,
  meResponseSchema,
  normalizePhoneToE164,
  onboardingFormSchema,
  onboardingRequestSchema,
  parseDateOnly,
  phoneInputSchema,
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

describe('normalizePhoneToE164', () => {
  it('converts common Israeli local formats to E.164', () => {
    expect(normalizePhoneToE164('050-1234567')).toBe('+972501234567');
    expect(normalizePhoneToE164('0501234567')).toBe('+972501234567');
    expect(normalizePhoneToE164('050 123 4567')).toBe('+972501234567');
    expect(normalizePhoneToE164('(050) 123-4567')).toBe('+972501234567');
  });

  it('accepts 972 and 00 prefixes and existing E.164', () => {
    expect(normalizePhoneToE164('+972501234567')).toBe('+972501234567');
    expect(normalizePhoneToE164('972501234567')).toBe('+972501234567');
    expect(normalizePhoneToE164('00972501234567')).toBe('+972501234567');
  });

  it('leaves unrecognizable input for later validation', () => {
    expect(normalizePhoneToE164('not a phone')).toBe('notaphone');
    expect(normalizePhoneToE164('   ')).toBe('');
  });
});

describe('phoneInputSchema', () => {
  it('normalizes a local Israeli mobile before validating', () => {
    expect(phoneInputSchema.parse('050-1234567')).toBe('+972501234567');
  });

  it('rejects a number that cannot be normalized to E.164', () => {
    expect(phoneInputSchema.safeParse('12345').success).toBe(false);
  });
});

describe('onboardingFormSchema', () => {
  it('accepts required fields and an optional blank birth date', () => {
    const parsed = onboardingFormSchema.parse({
      firstName: ' Noa ',
      lastName: 'Cohen',
      phone: '050-1234567',
      birthDate: '',
      locale: 'he',
    });

    expect(parsed.firstName).toBe('Noa');
    expect(parsed.phone).toBe('+972501234567');
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
});

describe('toOnboardingRequest', () => {
  it('omits blank optional fields and normalizes a local phone', () => {
    expect(
      toOnboardingRequest({
        firstName: 'Noa',
        lastName: 'Cohen',
        phone: '050-1234567',
        birthDate: '',
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

describe('onboardingRequestSchema', () => {
  const requiredFields = {
    firstName: 'Noa',
    lastName: 'Cohen',
    phone: '+972501234567',
    locale: 'he' as const,
  };

  it('omits a blank optional birth date', () => {
    const parsed = onboardingRequestSchema.parse({
      ...requiredFields,
      birthDate: '',
    });

    expect(parsed.birthDate).toBeUndefined();
    expect(parsed).toMatchObject(requiredFields);
  });

  it('rejects a datetime string that is not a calendar date', () => {
    expect(
      onboardingRequestSchema.safeParse({
        ...requiredFields,
        birthDate: '1990-03-15T00:00:00.000Z',
      }).success
    ).toBe(false);
  });
});

describe('parseDateOnly', () => {
  it('converts YYYY-MM-DD to a UTC midnight Date for Prisma DateTime', () => {
    expect(parseDateOnly('2026-09-30').toISOString()).toBe(
      '2026-09-30T00:00:00.000Z'
    );
  });

  it('rejects values Prisma would also reject as incomplete DateTime', () => {
    expect(() => parseDateOnly('2026-02-31')).toThrow(RangeError);
    expect(() => parseDateOnly('1990-03-15T00:00:00.000Z')).toThrow(RangeError);
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
