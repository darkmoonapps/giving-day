import { scrubSentryPii, type SentryEventLike } from './scrub-pii';

export const SENTRY_SEND_DEFAULT_PII = false as const;

export interface SentryInitConfig {
  dsn: string;
  sendDefaultPii: false;
  tracesSampleRate: number;
  beforeSend: (
    event: SentryEventLike,
    hint?: unknown
  ) => SentryEventLike | null;
}

export function isSentryDsnConfigured(dsn: string | undefined): dsn is string {
  return typeof dsn === 'string' && dsn.trim().length > 0;
}

export function createSentryInitConfig(dsn: string): SentryInitConfig {
  return {
    dsn,
    sendDefaultPii: SENTRY_SEND_DEFAULT_PII,
    tracesSampleRate: 0,
    beforeSend: (event: SentryEventLike, _hint?: unknown): SentryEventLike => {
      return scrubSentryPii(event);
    },
  };
}
