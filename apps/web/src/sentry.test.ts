import { isSentryDsnConfigured } from '@giving-day/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { initSentry } from './sentry';

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  ErrorBoundary: ({ children }: { children: unknown }): unknown => children,
}));

describe('initSentry', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('does not initialize Sentry when the DSN is missing', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', '');
    const sentry = await import('@sentry/react');

    initSentry();

    expect(isSentryDsnConfigured(import.meta.env.VITE_SENTRY_DSN)).toBe(false);
    expect(sentry.init).not.toHaveBeenCalled();
  });

  it('initializes Sentry with EU-safe defaults when a DSN is set', async () => {
    const dsn = 'https://examplePublicKey@o0.ingest.de.sentry.io/1';
    vi.stubEnv('VITE_SENTRY_DSN', dsn);
    const sentry = await import('@sentry/react');

    initSentry();

    expect(sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn,
        sendDefaultPii: false,
        tracesSampleRate: 0,
        environment: expect.any(String),
      })
    );
  });
});
