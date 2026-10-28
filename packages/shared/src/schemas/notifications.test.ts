import { describe, expect, it } from 'vitest';
import {
  announceDistributionDayResultSchema,
  pushSubscriptionSchema,
  upsertPushSubscriptionSchema,
  vapidPublicKeySchema,
} from './notifications';

describe('notification schemas', () => {
  it('accepts a Web Push subscription upsert with fake endpoint keys', () => {
    const upsert = {
      endpoint: 'https://push.example.com/fake-subscription',
      p256dh: 'fake-p256dh-key',
      auth: 'fake-auth-secret',
      userAgent: 'Mozilla/5.0 GivingDayTest',
    };

    expect(upsertPushSubscriptionSchema.parse(upsert)).toEqual(upsert);
  });

  it('does not include p256dh or auth on the public subscription payload', () => {
    const subscription = {
      id: '44444444-4444-4444-8444-444444444444',
      endpoint: 'https://push.example.com/fake-subscription',
      userAgent: 'Mozilla/5.0 GivingDayTest',
      createdAt: '2026-10-28T09:00:00.000Z',
      lastSuccessAt: null,
      failedCount: 0,
      disabledAt: null,
    };

    expect(pushSubscriptionSchema.parse(subscription)).toEqual(subscription);
    expect(
      pushSubscriptionSchema.parse({
        ...subscription,
        p256dh: 'secret',
        auth: 'secret',
      })
    ).toEqual(subscription);
  });

  it('treats missing VAPID keys as unconfigured', () => {
    expect(
      vapidPublicKeySchema.parse({ publicKey: null, configured: false })
    ).toEqual({ publicKey: null, configured: false });
    expect(
      announceDistributionDayResultSchema.parse({
        attempted: 2,
        sent: 1,
        failed: 0,
        skipped: 1,
      })
    ).toEqual({ attempted: 2, sent: 1, failed: 0, skipped: 1 });
  });
});
