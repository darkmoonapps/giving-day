import {
  isAbsoluteHttpsUrl,
  type Locale,
  type UpdateCitySettings,
} from '@giving-day/shared';
import type { CitySettingsResponseDto } from '../api/generated/api';

export const CITY_DEFAULT_THEME = 'wisteria-mint';

export const CITY_DEFAULT_THEMES = [CITY_DEFAULT_THEME] as const;

export interface CitySettingsFormValues {
  centerAddress: string;
  centerLat: string;
  centerLng: string;
  defaultStartTime: string;
  defaultEndTime: string;
  confirmReminderAfterHours: string;
  unpickedPushMinutesBeforeEnd: string;
  missingFinalStatusWaitHours: string;
  defaultLocale: Locale;
  defaultTheme: string;
  orgName: string;
  logoUrl: string;
}

export interface CitySettingsFormFieldErrors {
  centerAddress?: string;
  centerLat?: string;
  centerLng?: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
  confirmReminderAfterHours?: string;
  unpickedPushMinutesBeforeEnd?: string;
  missingFinalStatusWaitHours?: string;
  defaultLocale?: string;
  defaultTheme?: string;
  orgName?: string;
  logoUrl?: string;
}

export type ParseCitySettingsFormResult =
  | { success: true; data: UpdateCitySettings }
  | { success: false; errors: CitySettingsFormFieldErrors };

const TIME_INPUT = /^([01]\d|2[0-3]):[0-5]\d$/;
const DECIMAL = /^-?\d+(\.\d+)?$/;
const WHOLE_NUMBER = /^\d+$/;

const FORM_ERROR_KEYS = [
  'required',
  'invalid_time',
  'invalid_number',
  'invalid_integer',
  'https_url_required',
  'invalid_time_range',
] as const;

export type CitySettingsValidationKey = (typeof FORM_ERROR_KEYS)[number];

export function isCitySettingsValidationKey(
  value: string
): value is CitySettingsValidationKey {
  return (FORM_ERROR_KEYS as readonly string[]).includes(value);
}

export function toTimeInputValue(value: string): string {
  return value.length >= 5 ? value.slice(0, 5) : value;
}

function timeToMinutes(value: string): number {
  const [hoursText, minutesText] = value.split(':');
  return Number(hoursText) * 60 + Number(minutesText);
}

function parseRequiredText(
  value: string,
  maxLength: number
): { ok: true; value: string } | { ok: false; error: 'required' } {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) {
    return { ok: false, error: 'required' };
  }
  return { ok: true, value: trimmed };
}

function parseOptionalText(
  value: string,
  maxLength: number
): { ok: true; value: string | null } | { ok: false; error: 'required' } {
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    return { ok: false, error: 'required' };
  }
  return { ok: true, value: trimmed.length === 0 ? null : trimmed };
}

function parseDecimal(
  value: string,
  min: number,
  max: number
):
  | { ok: true; value: number }
  | { ok: false; error: 'required' | 'invalid_number' } {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: 'required' };
  }
  if (!DECIMAL.test(trimmed)) {
    return { ok: false, error: 'invalid_number' };
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return { ok: false, error: 'invalid_number' };
  }
  return { ok: true, value: parsed };
}

function parseInteger(
  value: string,
  min: number,
  max: number
):
  | { ok: true; value: number }
  | { ok: false; error: 'required' | 'invalid_integer' } {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: 'required' };
  }
  if (!WHOLE_NUMBER.test(trimmed)) {
    return { ok: false, error: 'invalid_integer' };
  }
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return { ok: false, error: 'invalid_integer' };
  }
  return { ok: true, value: parsed };
}

function parseTime(
  value: string
): { ok: true; value: string } | { ok: false; error: 'invalid_time' } {
  if (!TIME_INPUT.test(value)) {
    return { ok: false, error: 'invalid_time' };
  }
  return { ok: true, value };
}

function parseOptionalHttpsUrl(
  value: string
):
  | { ok: true; value: string | null }
  | { ok: false; error: 'required' | 'https_url_required' } {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { ok: true, value: null };
  }
  if (trimmed.length > 2048) {
    return { ok: false, error: 'required' };
  }
  if (!isAbsoluteHttpsUrl(trimmed)) {
    return { ok: false, error: 'https_url_required' };
  }
  return { ok: true, value: trimmed };
}

export function emptyCitySettingsFormValues(): CitySettingsFormValues {
  return {
    centerAddress: '',
    centerLat: '',
    centerLng: '',
    defaultStartTime: '09:00',
    defaultEndTime: '14:00',
    confirmReminderAfterHours: '24',
    unpickedPushMinutesBeforeEnd: '60',
    missingFinalStatusWaitHours: '72',
    defaultLocale: 'he',
    defaultTheme: CITY_DEFAULT_THEME,
    orgName: '',
    logoUrl: '',
  };
}

export function settingsToFormValues(
  settings: CitySettingsResponseDto
): CitySettingsFormValues {
  return {
    centerAddress: settings.centerAddress,
    centerLat: String(settings.centerLat),
    centerLng: String(settings.centerLng),
    defaultStartTime: toTimeInputValue(settings.defaultStartTime),
    defaultEndTime: toTimeInputValue(settings.defaultEndTime),
    confirmReminderAfterHours: String(settings.confirmReminderAfterHours),
    unpickedPushMinutesBeforeEnd: String(settings.unpickedPushMinutesBeforeEnd),
    missingFinalStatusWaitHours: String(settings.missingFinalStatusWaitHours),
    defaultLocale: settings.defaultLocale,
    defaultTheme: settings.defaultTheme,
    orgName: settings.orgName ?? '',
    logoUrl: settings.logoUrl ?? '',
  };
}

export function themeSelectValues(current: string): string[] {
  if (
    (CITY_DEFAULT_THEMES as readonly string[]).includes(current) ||
    current.length === 0
  ) {
    return [...CITY_DEFAULT_THEMES];
  }
  return [...CITY_DEFAULT_THEMES, current];
}

export function parseCitySettingsForm(
  values: CitySettingsFormValues
): ParseCitySettingsFormResult {
  const errors: CitySettingsFormFieldErrors = {};
  const centerAddress = parseRequiredText(values.centerAddress, 500);
  const centerLat = parseDecimal(values.centerLat, -90, 90);
  const centerLng = parseDecimal(values.centerLng, -180, 180);
  const defaultStartTime = parseTime(values.defaultStartTime);
  const defaultEndTime = parseTime(values.defaultEndTime);
  const confirmReminderAfterHours = parseInteger(
    values.confirmReminderAfterHours,
    0,
    10000
  );
  const unpickedPushMinutesBeforeEnd = parseInteger(
    values.unpickedPushMinutesBeforeEnd,
    0,
    10000
  );
  const missingFinalStatusWaitHours = parseInteger(
    values.missingFinalStatusWaitHours,
    0,
    10000
  );
  const defaultTheme = parseRequiredText(values.defaultTheme, 100);
  const orgName = parseOptionalText(values.orgName, 200);
  const logoUrl = parseOptionalHttpsUrl(values.logoUrl);

  if (!centerAddress.ok) {
    errors.centerAddress = centerAddress.error;
  }
  if (!centerLat.ok) {
    errors.centerLat = centerLat.error;
  }
  if (!centerLng.ok) {
    errors.centerLng = centerLng.error;
  }
  if (!defaultStartTime.ok) {
    errors.defaultStartTime = defaultStartTime.error;
  }
  if (!defaultEndTime.ok) {
    errors.defaultEndTime = defaultEndTime.error;
  } else if (
    defaultStartTime.ok &&
    timeToMinutes(defaultStartTime.value) >= timeToMinutes(defaultEndTime.value)
  ) {
    errors.defaultEndTime = 'invalid_time_range';
  }
  if (!confirmReminderAfterHours.ok) {
    errors.confirmReminderAfterHours = confirmReminderAfterHours.error;
  }
  if (!unpickedPushMinutesBeforeEnd.ok) {
    errors.unpickedPushMinutesBeforeEnd = unpickedPushMinutesBeforeEnd.error;
  }
  if (!missingFinalStatusWaitHours.ok) {
    errors.missingFinalStatusWaitHours = missingFinalStatusWaitHours.error;
  }
  if (!defaultTheme.ok) {
    errors.defaultTheme = defaultTheme.error;
  }
  if (!orgName.ok) {
    errors.orgName = orgName.error;
  }
  if (!logoUrl.ok) {
    errors.logoUrl = logoUrl.error;
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  if (
    !centerAddress.ok ||
    !centerLat.ok ||
    !centerLng.ok ||
    !defaultStartTime.ok ||
    !defaultEndTime.ok ||
    !confirmReminderAfterHours.ok ||
    !unpickedPushMinutesBeforeEnd.ok ||
    !missingFinalStatusWaitHours.ok ||
    !defaultTheme.ok ||
    !orgName.ok ||
    !logoUrl.ok
  ) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      centerAddress: centerAddress.value,
      centerLat: centerLat.value,
      centerLng: centerLng.value,
      defaultStartTime: defaultStartTime.value,
      defaultEndTime: defaultEndTime.value,
      confirmReminderAfterHours: confirmReminderAfterHours.value,
      unpickedPushMinutesBeforeEnd: unpickedPushMinutesBeforeEnd.value,
      missingFinalStatusWaitHours: missingFinalStatusWaitHours.value,
      defaultLocale: values.defaultLocale,
      defaultTheme: defaultTheme.value,
      orgName: orgName.value,
      logoUrl: logoUrl.value,
    },
  };
}
