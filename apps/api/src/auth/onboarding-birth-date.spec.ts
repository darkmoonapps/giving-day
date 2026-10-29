import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { toOnboardingBirthDate } from './onboarding-birth-date';

describe('toOnboardingBirthDate', () => {
  it('omits empty, null, and undefined values', () => {
    expect(toOnboardingBirthDate(undefined)).toBeUndefined();
    expect(toOnboardingBirthDate(null)).toBeUndefined();
    expect(toOnboardingBirthDate('')).toBeUndefined();
    expect(toOnboardingBirthDate('   ')).toBeUndefined();
  });

  it('parses a date-only string into a UTC Date for Prisma DateTime', () => {
    expect(toOnboardingBirthDate('2026-09-30')).toEqual(
      new Date('2026-09-30T00:00:00.000Z')
    );
  });

  it('passes through a valid Date', () => {
    const birthDate = new Date('1990-03-15T00:00:00.000Z');
    expect(toOnboardingBirthDate(birthDate)).toBe(birthDate);
  });

  it('rejects invalid calendar dates', () => {
    expect(() => toOnboardingBirthDate('not-a-date')).toThrow(
      BadRequestException
    );
    expect(() => toOnboardingBirthDate('2026-02-31')).toThrow(
      BadRequestException
    );
  });
});
