import { afterEach, describe, expect, it } from 'vitest';
import { createNotificationProvider } from './create-notification-provider';
import { LoggingNotificationProvider } from './logging.provider';

describe('createNotificationProvider', () => {
  afterEach(() => {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
  });

  it('uses the log/no-op provider when VAPID keys are absent', () => {
    expect(createNotificationProvider()).toBeInstanceOf(
      LoggingNotificationProvider
    );
  });
});
