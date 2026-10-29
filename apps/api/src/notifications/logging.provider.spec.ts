import { describe, expect, it } from 'vitest';
import { LoggingNotificationProvider } from './logging.provider';

describe('LoggingNotificationProvider', () => {
  it('resolves successfully without sending a network request', async () => {
    const provider = new LoggingNotificationProvider();
    const result = await provider.send(
      {
        endpoint: 'https://push.example.com/fake-subscription',
        p256dh: 'fake-p256dh-key',
        auth: 'fake-auth-secret',
      },
      {
        userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        cityId: '11111111-1111-4111-8111-111111111111',
        templateKey: 'day_invite',
        title: 'Distribution day',
        body: 'Can you deliver on 2026-11-15?',
        data: { date: '2026-11-15' },
        dedupeKey: 'day_invite:day:user',
      }
    );

    expect(result).toEqual({ ok: true });
  });
});
