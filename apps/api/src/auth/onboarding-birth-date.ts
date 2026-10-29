import { BadRequestException } from '@nestjs/common';
import { parseDateOnly } from '@giving-day/shared';

export function toOnboardingBirthDate(
  value: string | Date | null | undefined
): Date | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new BadRequestException('auth.invalid_birth_date');
    }
    return value;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  try {
    return parseDateOnly(trimmed);
  } catch {
    throw new BadRequestException('auth.invalid_birth_date');
  }
}
