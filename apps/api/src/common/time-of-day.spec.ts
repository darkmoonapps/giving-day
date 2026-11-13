import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  formatDateOnly,
  formatTime,
  instantFromZonedParts,
  normalizeTime,
  parseDateOnly,
  parseTime,
  timeToSeconds,
  todayInTimeZone,
} from './time-of-day';

describe('time-of-day helpers', () => {
  it('normalizes and formats city-settings times as UTC clock values', () => {
    expect(normalizeTime('9:00')).toBe('09:00:00');
    expect(formatTime(parseTime('09:00'))).toBe('09:00:00');
    expect(timeToSeconds('14:00:00')).toBe(14 * 3600);
  });

  it('parses calendar dates and rejects impossible days', () => {
    expect(formatDateOnly(parseDateOnly('2026-11-15'))).toBe('2026-11-15');
    expect(() => parseDateOnly('2026-02-31')).toThrow(BadRequestException);
    expect(() => parseDateOnly('15/11/2026')).toThrow(BadRequestException);
  });

  it('returns the calendar date in the city timezone', () => {
    const lateUtc = new Date('2026-10-31T22:00:00.000Z');
    expect(todayInTimeZone('UTC', lateUtc)).toBe('2026-10-31');
    expect(todayInTimeZone('Asia/Jerusalem', lateUtc)).toBe('2026-11-01');
  });

  it('converts Holon wall-clock end times in Asia/Jerusalem to UTC', () => {
    // November is Israel Standard Time (UTC+2).
    expect(
      instantFromZonedParts(
        '2026-11-15',
        '14:00:00',
        'Asia/Jerusalem'
      ).toISOString()
    ).toBe('2026-11-15T12:00:00.000Z');
    expect(
      instantFromZonedParts('2026-11-15', '14:00:00', 'UTC').toISOString()
    ).toBe('2026-11-15T14:00:00.000Z');
  });
});
