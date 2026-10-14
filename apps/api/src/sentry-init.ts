import {
  createSentryInitConfig,
  isSentryDsnConfigured,
  scrubSentryPii,
} from '@giving-day/shared';
import type * as Sentry from '@sentry/nestjs';

export function initApiSentry(
  sentry: Pick<typeof Sentry, 'init'>,
  env: NodeJS.ProcessEnv
): boolean {
  const dsn = env.SENTRY_DSN;
  if (!isSentryDsnConfigured(dsn)) {
    return false;
  }

  const config = createSentryInitConfig(dsn);
  sentry.init({
    dsn: config.dsn,
    sendDefaultPii: config.sendDefaultPii,
    tracesSampleRate: config.tracesSampleRate,
    environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
    beforeSend(event) {
      return scrubSentryPii(event);
    },
  });
  return true;
}
