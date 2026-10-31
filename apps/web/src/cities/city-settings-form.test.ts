import { describe, expect, it } from 'vitest';
import { CITY_DEFAULT_THEME } from '@giving-day/shared';
import { holonCitySettings } from '../test/city-settings-fixtures';
import {
  emptyCitySettingsFormValues,
  parseCitySettingsForm,
  settingsToFormValues,
  themeSelectValues,
  toTimeInputValue,
} from './city-settings-form';

describe('toTimeInputValue', () => {
  it('shortens API times for an HTML time input', () => {
    expect(toTimeInputValue('09:00:00')).toBe('09:00');
    expect(toTimeInputValue('14:00')).toBe('14:00');
  });
});

describe('themeSelectValues', () => {
  it('keeps the Holon default and includes an unknown saved theme', () => {
    expect(themeSelectValues(CITY_DEFAULT_THEME)).toEqual([CITY_DEFAULT_THEME]);
    expect(themeSelectValues('deep-plum')).toEqual([
      'wisteria-mint',
      'deep-plum',
    ]);
  });
});

describe('settingsToFormValues', () => {
  it('maps Holon city settings into form strings', () => {
    expect(settingsToFormValues(holonCitySettings)).toEqual({
      centerAddress: '10 Warehouse Rd, Holon',
      centerLat: '32.0114',
      centerLng: '34.7748',
      defaultStartTime: '09:00',
      defaultEndTime: '14:00',
      confirmReminderAfterHours: '24',
      unpickedPushMinutesBeforeEnd: '60',
      missingFinalStatusWaitHours: '72',
      defaultLocale: 'he',
      defaultTheme: 'wisteria-mint',
      orgName: 'Latet Holon',
      logoUrl: '',
    });
  });
});

describe('parseCitySettingsForm', () => {
  it('accepts Holon settings and clears empty optional fields', () => {
    const result = parseCitySettingsForm(
      settingsToFormValues(holonCitySettings)
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        centerAddress: '10 Warehouse Rd, Holon',
        centerLat: 32.0114,
        centerLng: 34.7748,
        defaultStartTime: '09:00',
        defaultEndTime: '14:00',
        confirmReminderAfterHours: 24,
        unpickedPushMinutesBeforeEnd: 60,
        missingFinalStatusWaitHours: 72,
        defaultLocale: 'he',
        defaultTheme: 'wisteria-mint',
        orgName: 'Latet Holon',
        logoUrl: null,
      });
    }
  });

  it('requires the distribution center address', () => {
    const values = emptyCitySettingsFormValues();
    values.centerLat = '32.0114';
    values.centerLng = '34.7748';

    const result = parseCitySettingsForm(values);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.centerAddress).toBe('required');
    }
  });

  it('rejects an invalid logo URL and a reversed time range', () => {
    const values = settingsToFormValues(holonCitySettings);
    values.logoUrl = 'http://example.com/logo.svg';
    values.defaultStartTime = '14:00';
    values.defaultEndTime = '09:00';

    const result = parseCitySettingsForm(values);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.logoUrl).toBe('https_url_required');
      expect(result.errors.defaultEndTime).toBe('invalid_time_range');
    }
  });

  it('rejects a negative reminder wait', () => {
    const values = settingsToFormValues(holonCitySettings);
    values.confirmReminderAfterHours = '-1';

    const result = parseCitySettingsForm(values);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.confirmReminderAfterHours).toBe('invalid_integer');
    }
  });
});
