import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendNotification = vi.fn();
const setVapidDetails = vi.fn();

class FakeWebPushError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'WebPushError';
  }
}

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: (...args: unknown[]) => setVapidDetails(...args),
    sendNotification: (...args: unknown[]) => sendNotification(...args),
  },
  WebPushError: FakeWebPushError,
}));

describe('WebPushNotificationProvider', () => {
  beforeEach(() => {
    sendNotification.mockReset();
    setVapidDetails.mockReset();
  });

  it('sends a JSON payload with env VAPID details', async () => {
    sendNotification.mockResolvedValue(undefined);
    const { WebPushNotificationProvider } = await import('./web-push.provider');
    const provider = new WebPushNotificationProvider({
      publicKey: 'fake-public',
      privateKey: 'fake-private',
      subject: 'mailto:noreply@example.com',
    });

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

    expect(setVapidDetails).toHaveBeenCalledWith(
      'mailto:noreply@example.com',
      'fake-public',
      'fake-private'
    );
    expect(result).toEqual({ ok: true });
  });

  it('marks 410 responses as gone so the subscription can be disabled', async () => {
    sendNotification.mockRejectedValue(new FakeWebPushError(410, 'Gone'));
    const { WebPushNotificationProvider } = await import('./web-push.provider');
    const provider = new WebPushNotificationProvider({
      publicKey: 'fake-public',
      privateKey: 'fake-private',
      subject: 'mailto:noreply@example.com',
    });

    const result = await provider.send(
      {
        endpoint: 'https://push.example.com/stale',
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

    expect(result.ok).toBe(false);
    expect(result.gone).toBe(true);
  });
});
