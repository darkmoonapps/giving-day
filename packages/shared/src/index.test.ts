import { describe, expect, it } from 'vitest';
import {
  CITY_DEFAULT_THEME,
  COLOR_SCHEME_STORAGE_KEY,
  createCitySchema,
  GIVING_DAY_THEME_ATTRIBUTE,
  citySettingsSchema,
  colorSchemePreferenceSchema,
  createSentryInitConfig,
  e164PhoneSchema,
  getDirection,
  healthResponseSchema,
  languageCodeSchema,
  normalizePhoneToE164,
  distributionDayDashboardSchema,
  openDistributionDaySchema,
  parseDateOnly,
  respondToDistributionDaySchema,
  assignDeliverySchema,
  rankReplacementSuggestions,
  updateDeliveryStatusSchema,
  createElderSchema,
  createElderChangeRequestSchema,
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
    expect(CITY_DEFAULT_THEME).toBe('wisteria-mint');
    expect(
      createCitySchema.parse({
        slug: 'example-city',
        nameHe: 'עיר דוגמה',
        nameEn: 'Example City',
      }).slug
    ).toBe('example-city');
    expect(GIVING_DAY_THEME_ATTRIBUTE).toBe('data-giving-day-theme');
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
      distributionDayDashboardSchema.parse({
        dayId: '33333333-3333-4333-8333-333333333333',
        cityId: '11111111-1111-4111-8111-111111111111',
        date: '2026-11-15',
        startTime: '09:00:00',
        endTime: '14:00:00',
        status: 'published',
        volunteers: { total: 1, confirmed: 1, pending: 0, declined: 0 },
        deliveries: {
          unassigned: 0,
          assigned: 1,
          picked: 0,
          delivered: 0,
          notDelivered: 0,
          cancelled: 0,
        },
        unassignedElders: [],
      }).volunteers.total
    ).toBe(1);
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
    expect(
      rankReplacementSuggestions(
        { street: '8 Weizmann St', addressNotes: null },
        [
          {
            id: '99999999-9999-4999-8999-999999999999',
            firstName: 'Dana',
            lastName: 'Levi',
            homeArea: 'Weizmann',
          },
        ]
      )[0]?.homeArea
    ).toBe('Weizmann');
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
      createElderChangeRequestSchema.parse({
        elderId: '12121212-1212-4121-8121-121212121212',
        changes: { notes: 'Knock loudly' },
      }).elderId
    ).toBe('12121212-1212-4121-8121-121212121212');
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
