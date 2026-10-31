import { describe, expect, it } from 'vitest';
import {
  CITY_DEFAULT_THEME,
  CITY_SLUG_MAX_LENGTH,
  addCityCoordinatorSchema,
  citySchema,
  createCitySchema,
  cityJoinLinkCreatedSchema,
  cityJoinLinkStatusSchema,
  cityMembershipRecordSchema,
  cityPendingMembershipsResponseSchema,
  citySettingsSchema,
  joinLinkPreviewSchema,
  redeemJoinLinkRequestSchema,
  redeemJoinLinkResponseSchema,
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
    defaultTheme: CITY_DEFAULT_THEME,
    orgName: 'Latet Holon',
    logoUrl: null,
    extra: { mapZoom: 14 },
  };

  it('accepts a new city payload and lowercases the slug', () => {
    expect(
      createCitySchema.parse({
        slug: 'Example-City',
        nameHe: ' עיר דוגמה ',
        nameEn: ' Example City ',
      })
    ).toEqual({
      slug: 'example-city',
      nameHe: 'עיר דוגמה',
      nameEn: 'Example City',
    });
  });

  it('rejects a slug that is not URL-safe', () => {
    expect(
      createCitySchema.safeParse({
        slug: 'Holon City',
        nameHe: 'חולון',
        nameEn: 'Holon',
      }).success
    ).toBe(false);
    expect(
      createCitySchema.safeParse({
        slug: 'חולון',
        nameHe: 'חולון',
        nameEn: 'Holon',
      }).success
    ).toBe(false);
  });

  it('rejects a slug longer than 64 characters with slug_too_long', () => {
    const names = { nameHe: 'חולון', nameEn: 'Holon' };
    expect(
      createCitySchema.safeParse({
        ...names,
        slug: 'a'.repeat(CITY_SLUG_MAX_LENGTH),
      }).success
    ).toBe(true);

    const tooLong = createCitySchema.safeParse({
      ...names,
      slug: 'a'.repeat(CITY_SLUG_MAX_LENGTH + 1),
    });
    expect(tooLong.success).toBe(false);
    if (!tooLong.success) {
      expect(tooLong.error.issues[0]?.message).toBe('slug_too_long');
    }
  });

  it('accepts a real IANA timezone and rejects an unknown zone', () => {
    expect(
      createCitySchema.parse({
        slug: 'example-city',
        nameHe: 'עיר דוגמה',
        nameEn: 'Example City',
        timezone: 'Asia/Jerusalem',
      }).timezone
    ).toBe('Asia/Jerusalem');

    const invalid = createCitySchema.safeParse({
      slug: 'example-city',
      nameHe: 'עיר דוגמה',
      nameEn: 'Example City',
      timezone: 'Mars/Olympus',
    });
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(invalid.error.issues[0]?.message).toBe('invalid_timezone');
    }
  });

  it('accepts a created city response', () => {
    const created = {
      id: '22222222-2222-4222-8222-222222222222',
      slug: 'example-city',
      nameHe: 'עיר דוגמה',
      nameEn: 'Example City',
      timezone: 'Asia/Jerusalem',
      isActive: true,
    };

    expect(citySchema.parse(created)).toEqual(created);
  });

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

  it('accepts a join-token redeem request and pending membership payload', () => {
    expect(
      redeemJoinLinkRequestSchema.parse({ token: 'fake-join-token' })
    ).toEqual({ token: 'fake-join-token' });
    expect(redeemJoinLinkRequestSchema.safeParse({ token: '' }).success).toBe(
      false
    );

    const redeemed = {
      result: 'pending' as const,
      membership: {
        membershipId: '99999999-9999-4999-8999-999999999999',
        cityId: '11111111-1111-4111-8111-111111111111',
        citySlug: 'holon',
        cityNameHe: 'חולון',
        cityNameEn: 'Holon',
        role: 'volunteer' as const,
        status: 'pending' as const,
      },
    };
    expect(redeemJoinLinkResponseSchema.parse(redeemed)).toEqual(redeemed);
    expect(
      redeemJoinLinkResponseSchema.parse({
        ...redeemed,
        result: 'already_active',
        membership: { ...redeemed.membership, status: 'active' },
      }).result
    ).toBe('already_active');
    expect(
      redeemJoinLinkResponseSchema.parse({
        ...redeemed,
        result: 'already_pending',
      }).result
    ).toBe('already_pending');
    expect(
      redeemJoinLinkResponseSchema.parse({
        ...redeemed,
        result: 'rejected',
      }).result
    ).toBe('rejected');
  });

  it('accepts a public join-link preview without a secret token', () => {
    const preview = {
      cityId: '11111111-1111-4111-8111-111111111111',
      citySlug: 'holon',
      cityNameHe: 'חולון',
      cityNameEn: 'Holon',
      role: 'volunteer' as const,
    };

    expect(joinLinkPreviewSchema.parse(preview)).toEqual(preview);
    expect(
      joinLinkPreviewSchema.parse({
        ...preview,
        token: 'fake-join-token',
      })
    ).toEqual(preview);
  });

  it('lists pending memberships without a join token', () => {
    const row = {
      membershipId: '99999999-9999-4999-8999-999999999999',
      userId: '12121212-1212-4121-8121-121212121212',
      firstName: 'Tamar',
      lastName: 'Shalev',
      email: 'tamar.shalev@example.com',
      phone: '+972506666666',
      role: 'volunteer' as const,
      status: 'pending' as const,
      createdAt: '2026-10-28T09:00:00.000Z',
      approvedAt: null,
    };

    expect(cityMembershipRecordSchema.parse(row)).toEqual(row);
    expect(
      cityPendingMembershipsResponseSchema.parse({ memberships: [row] })
    ).toEqual({
      memberships: [row],
    });
    expect(
      cityMembershipRecordSchema.parse({
        ...row,
        token: 'fake-join-token',
      })
    ).toEqual(row);
  });
});
