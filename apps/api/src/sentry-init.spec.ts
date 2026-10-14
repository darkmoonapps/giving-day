import { afterEach, describe, expect, it, vi } from 'vitest';
import { initApiSentry } from './sentry-init';

describe('initApiSentry', () => {
  afterEach(() => {
    delete process.env.SENTRY_DSN;
    delete process.env.SENTRY_ENVIRONMENT;
  });

  it('is a no-op when the DSN is missing', () => {
    const init = vi.fn();

    expect(initApiSentry({ init }, {})).toBe(false);
    expect(init).not.toHaveBeenCalled();
  });

  it('initializes with sendDefaultPii false when a DSN is set', () => {
    const init = vi.fn();
    const dsn = 'https://examplePublicKey@o0.ingest.de.sentry.io/1';

    expect(
      initApiSentry({ init }, { SENTRY_DSN: dsn, SENTRY_ENVIRONMENT: 'test' })
    ).toBe(true);

    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn,
        sendDefaultPii: false,
        tracesSampleRate: 0,
        environment: 'test',
      })
    );
  });
});
