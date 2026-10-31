import { BadRequestException } from '@nestjs/common';
import { DATE_ONLY_PATTERN } from '@giving-day/shared';

export function normalizeTime(value: string): string {
  const parts = value.split(':');
  const hours = (parts[0] ?? '00').padStart(2, '0');
  const minutes = (parts[1] ?? '00').padStart(2, '0');
  const seconds = (parts[2] ?? '00').padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function parseTime(value: string): Date {
  const normalized = normalizeTime(value);
  const [hours, minutes, seconds] = normalized
    .split(':')
    .map((part) => Number(part));
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds));
}

export function formatTime(value: Date): string {
  const hours = value.getUTCHours().toString().padStart(2, '0');
  const minutes = value.getUTCMinutes().toString().padStart(2, '0');
  const seconds = value.getUTCSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function timeToSeconds(value: string): number {
  const [hours, minutes, seconds] = normalizeTime(value)
    .split(':')
    .map((part) => Number(part));
  return hours * 3600 + minutes * 60 + seconds;
}

export function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function todayInTimeZone(
  timeZone: string,
  now: Date = new Date()
): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function parseDateOnly(value: string): Date {
  if (!DATE_ONLY_PATTERN.test(value)) {
    throw new BadRequestException('validation.invalid_date');
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || formatDateOnly(parsed) !== value) {
    throw new BadRequestException('validation.invalid_date');
  }

  return parsed;
}
