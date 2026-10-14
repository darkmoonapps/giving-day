const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN =
  /(?<!\d)(?:\+972[-\s]?|0)(?:5\d|[2-489])[-\s]?\d{3}[-\s]?\d{4}(?!\d)/g;
const IPV4_PATTERN =
  /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;
const IPV6_PATTERN = /\b(?:[A-F0-9]{1,4}:){2,7}[A-F0-9]{1,4}\b/gi;

const REDACTED = '[redacted]';

const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'cookies',
  'email',
  'ip',
  'ip_address',
  'password',
  'phone',
  'phonenumber',
  'secret',
  'token',
  'access_token',
  'refresh_token',
  'x-forwarded-for',
  'x-real-ip',
  'remote_addr',
]);

export interface SentryUserLike {
  id?: string | number;
  email?: string | null;
  ip_address?: string | null;
  username?: string | null;
  [key: string]: unknown;
}

export interface SentryRequestLike {
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string> | string;
  query_string?:
    | string
    | Array<[string, string]>
    | Record<string, string | string[] | undefined>;
  data?: unknown;
  env?: Record<string, string | undefined>;
}

export interface SentryBreadcrumbLike {
  message?: string;
  data?: Record<string, unknown>;
}

export interface SentryEventLike {
  message?: string;
  user?: SentryUserLike;
  request?: SentryRequestLike;
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
  tags?: Record<string, unknown>;
  breadcrumbs?: SentryBreadcrumbLike[];
}

export function scrubPiiString(value: string): string {
  return value
    .replace(EMAIL_PATTERN, REDACTED)
    .replace(PHONE_PATTERN, REDACTED)
    .replace(IPV4_PATTERN, REDACTED)
    .replace(IPV6_PATTERN, REDACTED);
}

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key.toLowerCase());
}

export function scrubUnknown(value: unknown): unknown {
  if (typeof value === 'string') {
    return scrubPiiString(value);
  }

  if (Array.isArray(value)) {
    return value.map(scrubUnknown);
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    const result: Record<string, unknown> = {};
    for (const [key, nested] of entries) {
      result[key] = isSensitiveKey(key) ? REDACTED : scrubUnknown(nested);
    }
    return result;
  }

  return value;
}

function scrubHeaders(
  headers: SentryRequestLike['headers']
): SentryRequestLike['headers'] {
  if (headers === undefined) {
    return undefined;
  }

  const result: Record<string, string | string[] | undefined> = {};
  for (const [key, headerValue] of Object.entries(headers)) {
    if (isSensitiveKey(key)) {
      result[key] = REDACTED;
      continue;
    }
    if (typeof headerValue === 'string') {
      result[key] = scrubPiiString(headerValue);
    } else if (Array.isArray(headerValue)) {
      result[key] = headerValue.map(scrubPiiString);
    } else {
      result[key] = headerValue;
    }
  }
  return result;
}

export function scrubSentryPii<T extends SentryEventLike>(event: T): T {
  if (event.message !== undefined) {
    event.message = scrubPiiString(event.message);
  }

  if (event.user !== undefined) {
    delete event.user.email;
    delete event.user.ip_address;
    delete event.user.username;
    event.user = scrubUnknown(event.user) as SentryUserLike;
  }

  if (event.request !== undefined) {
    const request = event.request;
    if (request.url !== undefined) {
      request.url = scrubPiiString(request.url);
    }
    request.headers = scrubHeaders(request.headers);
    delete request.cookies;
    delete request.data;
    if (request.query_string !== undefined) {
      request.query_string = scrubUnknown(request.query_string) as
        | string
        | Array<[string, string]>
        | Record<string, string | string[] | undefined>;
    }
    if (request.env !== undefined) {
      const env: Record<string, string | undefined> = {};
      for (const [key, envValue] of Object.entries(request.env)) {
        env[key] = isSensitiveKey(key)
          ? REDACTED
          : typeof envValue === 'string'
            ? scrubPiiString(envValue)
            : envValue;
      }
      request.env = env;
    }
  }

  if (event.extra !== undefined) {
    event.extra = scrubUnknown(event.extra) as Record<string, unknown>;
  }
  if (event.contexts !== undefined) {
    event.contexts = scrubUnknown(event.contexts) as Record<string, unknown>;
  }
  if (event.tags !== undefined) {
    event.tags = scrubUnknown(event.tags) as Record<string, unknown>;
  }
  if (event.breadcrumbs !== undefined) {
    event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
      const next: SentryBreadcrumbLike = { ...breadcrumb };
      if (next.message !== undefined) {
        next.message = scrubPiiString(next.message);
      }
      if (next.data !== undefined) {
        next.data = scrubUnknown(next.data) as Record<string, unknown>;
      }
      return next;
    });
  }

  return event;
}
