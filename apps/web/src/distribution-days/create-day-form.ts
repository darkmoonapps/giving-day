import {
  openDistributionDaySchema,
  type OpenDistributionDay,
} from '@giving-day/shared';
import { toTimeInputValue } from '../cities/city-settings-form';

export interface CreateDayFormValues {
  date: string;
  startTime: string;
  endTime: string;
  notesForVolunteers: string;
  internalNotes: string;
  addOns: string;
}

export interface CreateDayFormFieldErrors {
  date?: string;
  startTime?: string;
  endTime?: string;
  notesForVolunteers?: string;
  internalNotes?: string;
  addOns?: string;
}

export type ParseCreateDayFormResult =
  | { success: true; data: OpenDistributionDay }
  | { success: false; errors: CreateDayFormFieldErrors };

const FORM_ERROR_KEYS = [
  'required',
  'invalid_date',
  'invalid_time',
  'invalid_time_range',
  'too_long',
] as const;

export type CreateDayValidationKey = (typeof FORM_ERROR_KEYS)[number];

const FORM_FIELD_KEYS = [
  'date',
  'startTime',
  'endTime',
  'notesForVolunteers',
  'internalNotes',
  'addOns',
] as const;

type CreateDayFormField = (typeof FORM_FIELD_KEYS)[number];

export function isCreateDayValidationKey(
  value: string
): value is CreateDayValidationKey {
  return (FORM_ERROR_KEYS as readonly string[]).includes(value);
}

export function emptyCreateDayFormValues(hours?: {
  startTime: string;
  endTime: string;
}): CreateDayFormValues {
  return {
    date: '',
    startTime:
      hours === undefined ? '09:00' : toTimeInputValue(hours.startTime),
    endTime: hours === undefined ? '14:00' : toTimeInputValue(hours.endTime),
    notesForVolunteers: '',
    internalNotes: '',
    addOns: '',
  };
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function parseAddOnsInput(value: string): string[] {
  return value
    .split(/[,|\n]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function toValidationKey(message: string): CreateDayValidationKey {
  const stripped = message.startsWith('validation.')
    ? message.slice('validation.'.length)
    : message;
  return isCreateDayValidationKey(stripped) ? stripped : 'required';
}

function isCreateDayFormField(value: PropertyKey): value is CreateDayFormField {
  return (FORM_FIELD_KEYS as readonly PropertyKey[]).includes(value);
}

export function parseCreateDayForm(
  values: CreateDayFormValues
): ParseCreateDayFormResult {
  const errors: CreateDayFormFieldErrors = {};

  if (values.date.trim().length === 0) {
    errors.date = 'required';
  }
  if (values.startTime.trim().length === 0) {
    errors.startTime = 'required';
  }
  if (values.endTime.trim().length === 0) {
    errors.endTime = 'required';
  }

  const addOns = parseAddOnsInput(values.addOns);
  const parsed = openDistributionDaySchema.safeParse({
    date: values.date,
    startTime: values.startTime,
    endTime: values.endTime,
    notesForVolunteers: blankToNull(values.notesForVolunteers),
    internalNotes: blankToNull(values.internalNotes),
    addOns: addOns.length === 0 ? undefined : addOns,
  });

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (!isCreateDayFormField(key) || errors[key] !== undefined) {
        continue;
      }
      errors[key] = toValidationKey(issue.message);
    }
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  if (!parsed.success) {
    return { success: false, errors };
  }

  return { success: true, data: parsed.data };
}
