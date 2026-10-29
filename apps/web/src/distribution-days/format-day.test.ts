import { describe, expect, it } from 'vitest';
import { formatDayHours, formatDistributionDate, isUuid } from './format-day';

describe('formatDistributionDate', () => {
  it('formats a calendar date in English without UTC shifting', () => {
    expect(formatDistributionDate('2026-11-15', 'en')).toContain('November');
    expect(formatDistributionDate('2026-11-15', 'en')).toContain('15');
  });

  it('returns the original value when the date is not calendar-only', () => {
    expect(formatDistributionDate('not-a-date', 'he')).toBe('not-a-date');
  });
});

describe('formatDayHours', () => {
  it('shortens API times to hours and minutes', () => {
    expect(formatDayHours('09:00:00', '14:00:00')).toBe('09:00 – 14:00');
  });
});

describe('isUuid', () => {
  it('accepts a version 4 UUID', () => {
    expect(isUuid('33333333-3333-4333-8333-333333333333')).toBe(true);
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });
});
