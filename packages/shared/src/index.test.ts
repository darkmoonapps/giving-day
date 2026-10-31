import { describe, expect, it } from 'vitest';
import {
  COLOR_SCHEME_STORAGE_KEY,
  citySettingsSchema,
  colorSchemePreferenceSchema,
  createSentryInitConfig,
  e164PhoneSchema,
  getDirection,
  healthResponseSchema,
  languageCodeSchema,
  normalizePhoneToE164,
  openDistributionDaySchema,
  parseDateOnly,
  respondToDistributionDaySchema,
  assignDeliverySchema,
  updateDeliveryStatusSchema,
  createElderSchema,
  createPermanentMatchSchema,
  SENTRY_SEND_DEFAULT_PII,
  templateKeySchema,
} from './index';

describe('shared public exports', () => {
  it('exposes the health, language, and color-scheme contracts', () => {
    expect(
      healthResponseSchema.parse({
        status: 'healthy',
        timestamp: '2026-01-15T10:00:00.000Z',
        database: { connected: true },
      }).status
    ).toBe('healthy');
    expect(languageCodeSchema.parse('he')).toBe('he');
    expect(getDirection('en')).toBe('ltr');
    expect(colorSchemePreferenceSchema.parse('auto')).toBe('auto');
    expect(COLOR_SCHEME_STORAGE_KEY).toBe('giving-day-ui');
    expect(SENTRY_SEND_DEFAULT_PII).toBe(false);
    expect(citySettingsSchema.shape.defaultTheme).toBeDefined();
    expect(e164PhoneSchema.parse('+972501234567')).toBe('+972501234567');
    expect(normalizePhoneToE164('050-1234567')).toBe('+972501234567');
    expect(parseDateOnly('1990-03-15').toISOString()).toBe(
      '1990-03-15T00:00:00.000Z'
    );
    expect(openDistributionDaySchema.parse({ date: '2026-11-15' }).date).toBe(
      '2026-11-15'
    );
    expect(
      respondToDistributionDaySchema.parse({
        status: 'declined',
        cancelReason: 'Family event in Holon',
      }).status
    ).toBe('declined');
    expect(templateKeySchema.parse('day_invite')).toBe('day_invite');
    expect(assignDeliverySchema.parse({ volunteerId: null }).volunteerId).toBe(
      null
    );
    expect(updateDeliveryStatusSchema.parse({ status: 'picked' }).status).toBe(
      'picked'
    );
    expect(
      createElderSchema.parse({
        fullName: 'Elder A',
        street: '1 Test Street',
        houseNumber: '1',
      }).fullName
    ).toBe('Elder A');
    expect(
      createPermanentMatchSchema.parse({
        elderId: '12121212-1212-4121-8121-121212121212',
        volunteerId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      }).elderId
    ).toBe('12121212-1212-4121-8121-121212121212');
    expect(
      createSentryInitConfig(
        'https://examplePublicKey@o0.ingest.de.sentry.io/0'
      ).sendDefaultPii
    ).toBe(false);
  });
});
