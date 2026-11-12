import {
  NOTES_FOR_VOLUNTEERS_MAX_LENGTH,
  type UpdateDistributionDay,
} from '@giving-day/shared';
import { toTimeInputValue } from '../cities/city-settings-form';

export interface DayDetailsFormValues {
  startTime: string;
  endTime: string;
  notesForVolunteers: string;
}

export interface DayDetailsFormFieldErrors {
  startTime?: string;
  endTime?: string;
  notesForVolunteers?: string;
}

export type ParseDayDetailsFormResult =
  | { success: true; data: UpdateDistributionDay }
  | { success: false; errors: DayDetailsFormFieldErrors };

export interface DayDetailsSource {
  startTime: string;
  endTime: string;
  notesForVolunteers: string | null;
  status: string;
}

const TIME_INPUT = /^([01]\d|2[0-3]):[0-5]\d$/;
const FORM_ERROR_KEYS = [
  'required',
  'invalid_time',
  'invalid_time_range',
  'too_long',
] as const;

export type DayDetailsValidationKey = (typeof FORM_ERROR_KEYS)[number];

export function isDayDetailsValidationKey(
  value: string
): value is DayDetailsValidationKey {
  return (FORM_ERROR_KEYS as readonly string[]).includes(value);
}

export function isEditableDayStatus(status: string): boolean {
  return (
    status === 'draft' || status === 'published' || status === 'in_progress'
  );
}

export function dayToFormValues(day: DayDetailsSource): DayDetailsFormValues {
  return {
    startTime: toTimeInputValue(day.startTime),
    endTime: toTimeInputValue(day.endTime),
    notesForVolunteers: day.notesForVolunteers ?? '',
  };
}

function parseTime(
  value: string
): { ok: true; value: string } | { ok: false; error: 'invalid_time' } {
  const normalized = toTimeInputValue(value);
  if (!TIME_INPUT.test(normalized)) {
    return { ok: false, error: 'invalid_time' };
  }
  return { ok: true, value: normalized };
}

function timeToMinutes(value: string): number {
  const [hoursText, minutesText] = value.split(':');
  return Number(hoursText) * 60 + Number(minutesText);
}

export function parseDayDetailsForm(
  values: DayDetailsFormValues
): ParseDayDetailsFormResult {
  const errors: DayDetailsFormFieldErrors = {};
  const startTime = parseTime(values.startTime);
  const endTime = parseTime(values.endTime);
  const notes = values.notesForVolunteers.trim();

  if (!startTime.ok) {
    errors.startTime = startTime.error;
  }
  if (!endTime.ok) {
    errors.endTime = endTime.error;
  }
  if (notes.length > NOTES_FOR_VOLUNTEERS_MAX_LENGTH) {
    errors.notesForVolunteers = 'too_long';
  }
  if (
    startTime.ok &&
    endTime.ok &&
    timeToMinutes(startTime.value) >= timeToMinutes(endTime.value)
  ) {
    errors.endTime = 'invalid_time_range';
  }

  if (Object.keys(errors).length > 0 || !startTime.ok || !endTime.ok) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      startTime: startTime.value,
      endTime: endTime.value,
      notesForVolunteers: notes.length === 0 ? null : notes,
    },
  };
}
