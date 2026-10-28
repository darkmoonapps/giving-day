import { describe, expect, it } from 'vitest';
import {
  addCityCoordinatorSchema,
  cityJoinLinkCreatedSchema,
  cityJoinLinkStatusSchema,
  citySettingsSchema,
  timeOfDaySchema,
  updateCitySettingsSchema,
} from './city';

describe('city schemas', () => {
  const settings = {
    cityId: '11111111-1111-4111-8111-111111111111',
    centerAddress: '10 Warehouse Rd, Holon',
    centerLat: 32.0114,
    centerLng: 34.7748,
    defaultStartTime: '09:00:00',
    defaultEndTime: '14:00',
    confirmReminderAfterHours: 24,
    unpickedPushMinutesBeforeEnd: 60,
    missingFinalStatusWaitHours: 72,
    defaultLocale: 'he' as const,
    defaultTheme: 'wisteria-mint',
    orgName: 'Latet Holon',
    logoUrl: null,
    extra: { mapZoom: 14 },
  };

  it('accepts city settings with fake Holon center data', () => {
    expect(citySettingsSchema.parse(settings)).toEqual(settings);
  });

  it('rejects an invalid distribution time', () => {
    expect(timeOfDaySchema.safeParse('25:00').success).toBe(false);
    expect(timeOfDaySchema.safeParse('09:00').success).toBe(true);
  });

  it('allows a partial settings update', () => {
    expect(
      updateCitySettingsSchema.parse({ defaultStartTime: '08:30' })
    ).toEqual({ defaultStartTime: '08:30' });
  });

  it('accepts a one-time created join link payload', () => {
    const created = {
      role: 'volunteer' as const,
      token: 'fake-join-token',
      url: 'http://localhost:3000/join/fake-join-token',
      createdAt: '2026-10-28T09:00:00.000Z',
      usedCount: 0,
    };

    expect(cityJoinLinkCreatedSchema.parse(created)).toEqual(created);
  });

  it('lists join-link status without a secret token', () => {
    const status = {
      role: 'volunteer' as const,
      active: true,
      createdAt: '2026-10-28T09:00:00.000Z',
      usedCount: 2,
    };

    expect(cityJoinLinkStatusSchema.parse(status)).toEqual(status);
    expect(
      cityJoinLinkStatusSchema.parse({
        ...status,
        token: 'fake-join-token',
        url: 'http://localhost:3000/join/fake-join-token',
      })
    ).toEqual(status);
  });

  it('accepts a null logoUrl and an absolute https logo URL', () => {
    expect(
      citySettingsSchema.parse({
        ...settings,
        logoUrl: 'https://example.com/logo.svg',
      }).logoUrl
    ).toBe('https://example.com/logo.svg');
    expect(citySettingsSchema.parse(settings).logoUrl).toBeNull();
  });

  it('rejects javascript: and http: logo URLs', () => {
    expect(
      updateCitySettingsSchema.safeParse({
        logoUrl: 'javascript:alert(1)',
      }).success
    ).toBe(false);
    expect(
      updateCitySettingsSchema.safeParse({
        logoUrl: 'http://example.com/logo.svg',
      }).success
    ).toBe(false);
  });

  it('requires userId or email when adding a coordinator', () => {
    expect(addCityCoordinatorSchema.safeParse({}).success).toBe(false);
    expect(
      addCityCoordinatorSchema.parse({
        email: 'coordinator@example.com',
      })
    ).toEqual({ email: 'coordinator@example.com' });
  });
});
