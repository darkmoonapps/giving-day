import { describe, expect, it } from 'vitest';
import {
  isSensitiveKey,
  scrubPiiString,
  scrubSentryPii,
  type SentryEventLike,
} from './scrub-pii';
import {
  createSentryInitConfig,
  isSentryDsnConfigured,
  SENTRY_SEND_DEFAULT_PII,
} from './options';

describe('scrubPiiString', () => {
  it('redacts emails, Israeli phone numbers, and IP addresses', () => {
    const input =
      'Contact volunteer@example.com or 050-1234567 from 203.0.113.10';
    const scrubbed = scrubPiiString(input);

    expect(scrubbed).not.toContain('volunteer@example.com');
    expect(scrubbed).not.toContain('050-1234567');
    expect(scrubbed).not.toContain('203.0.113.10');
    expect(scrubbed).toContain('[redacted]');
  });
});

describe('isSensitiveKey', () => {
  it('matches authorization, cookies, and IP fields', () => {
    expect(isSensitiveKey('Authorization')).toBe(true);
    expect(isSensitiveKey('ip_address')).toBe(true);
    expect(isSensitiveKey('status')).toBe(false);
  });
});

describe('scrubSentryPii', () => {
  it('strips user PII, IP address, cookies, and sensitive headers', () => {
    const event: SentryEventLike = {
      message: 'Failed for volunteer@example.com',
      user: {
        email: 'volunteer@example.com',
        ip_address: '198.51.100.20',
        username: 'maya',
        id: 'user-1',
      },
      request: {
        url: 'https://example.test/api?email=volunteer@example.com',
        headers: {
          Authorization: 'Bearer secret-token',
          'X-Forwarded-For': '198.51.100.20',
          Accept: 'application/json',
        },
        cookies: 'session=abc',
        data: { phone: '050-1234567' },
        env: { REMOTE_ADDR: '198.51.100.20' },
      },
      extra: {
        note: 'Call 050-1234567',
        phone: '050-1234567',
      },
      breadcrumbs: [
        {
          message: 'Loaded volunteer@example.com',
          data: { token: 'abc' },
        },
      ],
    };

    const scrubbed = scrubSentryPii(event);

    expect(scrubbed.message).not.toContain('volunteer@example.com');
    expect(scrubbed.user?.email).toBeUndefined();
    expect(scrubbed.user?.ip_address).toBeUndefined();
    expect(scrubbed.user?.username).toBeUndefined();
    expect(scrubbed.request?.cookies).toBeUndefined();
    expect(scrubbed.request?.data).toBeUndefined();
    expect(scrubbed.request?.headers?.Authorization).toBe('[redacted]');
    expect(scrubbed.request?.headers?.['X-Forwarded-For']).toBe('[redacted]');
    expect(scrubbed.request?.headers?.Accept).toBe('application/json');
    expect(scrubbed.request?.env?.REMOTE_ADDR).toBe('[redacted]');
    expect(scrubbed.extra?.phone).toBe('[redacted]');
    expect(String(scrubbed.extra?.note)).not.toContain('050-1234567');
    expect(scrubbed.breadcrumbs?.[0]?.data?.token).toBe('[redacted]');
  });
});

describe('createSentryInitConfig', () => {
  it('disables default PII, tracing, and is a no-op without a DSN', () => {
    expect(isSentryDsnConfigured(undefined)).toBe(false);
    expect(isSentryDsnConfigured('')).toBe(false);
    expect(isSentryDsnConfigured('   ')).toBe(false);
    expect(
      isSentryDsnConfigured('https://examplePublicKey@o0.ingest.de.sentry.io/0')
    ).toBe(true);

    const config = createSentryInitConfig(
      'https://examplePublicKey@o0.ingest.de.sentry.io/0'
    );
    expect(config.sendDefaultPii).toBe(false);
    expect(SENTRY_SEND_DEFAULT_PII).toBe(false);
    expect(config.tracesSampleRate).toBe(0);
    expect(
      config.beforeSend({
        user: { ip_address: '203.0.113.10', email: 'a@b.co' },
      }).user?.ip_address
    ).toBeUndefined();
  });
});
