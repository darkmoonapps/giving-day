import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { OnboardingDto } from './onboarding.dto';

async function validateOnboarding(
  payload: Record<string, unknown>
): Promise<{ dto: OnboardingDto; errorCount: number }> {
  const dto = plainToInstance(OnboardingDto, payload);
  const errors = await validate(dto);
  return { dto, errorCount: errors.length };
}

describe('OnboardingDto', () => {
  const requiredFields = {
    firstName: 'Noa',
    lastName: 'Cohen',
    phone: '+972501234567',
    locale: 'he',
  };

  it('accepts required fields without a birth date', async () => {
    const { dto, errorCount } = await validateOnboarding(requiredFields);

    expect(errorCount).toBe(0);
    expect(dto.birthDate).toBeUndefined();
  });

  it('treats an empty birth date as omitted', async () => {
    const { dto, errorCount } = await validateOnboarding({
      ...requiredFields,
      birthDate: '',
    });

    expect(errorCount).toBe(0);
    expect(dto.birthDate).toBeUndefined();
  });

  it('keeps a date-only birth date as YYYY-MM-DD', async () => {
    const { dto, errorCount } = await validateOnboarding({
      ...requiredFields,
      birthDate: '2026-09-30',
    });

    expect(errorCount).toBe(0);
    expect(dto.birthDate).toBe('2026-09-30');
  });

  it('rejects a datetime string that is not a calendar date', async () => {
    const { errorCount } = await validateOnboarding({
      ...requiredFields,
      birthDate: '2026-09-30T00:00:00.000Z',
    });

    expect(errorCount).toBeGreaterThan(0);
  });
});
