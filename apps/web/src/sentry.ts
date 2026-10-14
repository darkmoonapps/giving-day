import {
  createSentryInitConfig,
  isSentryDsnConfigured,
  scrubSentryPii,
} from '@giving-day/shared';
import * as Sentry from '@sentry/react';

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!isSentryDsnConfigured(dsn)) {
    return;
  }

  const config = createSentryInitConfig(dsn);
  Sentry.init({
    dsn: config.dsn,
    sendDefaultPii: config.sendDefaultPii,
    tracesSampleRate: config.tracesSampleRate,
    environment: import.meta.env.MODE,
    beforeSend(event) {
      return scrubSentryPii(event);
    },
  });
}
