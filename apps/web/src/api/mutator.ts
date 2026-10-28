import { refreshTokenResponseSchema } from '@giving-day/shared';
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from '../auth/access-token';

const REFRESH_PATH = '/api/auth/refresh';

export class ApiError extends Error {
  public readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export interface ApiRequestInit extends RequestInit {
  skipAuthRefresh?: boolean;
}

export function resolveApiUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  const base = import.meta.env.VITE_API_URL;
  if (typeof base !== 'string' || base.trim().length === 0) {
    return url;
  }

  const normalizedBase = base.replace(/\/$/, '');
  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  return `${normalizedBase}${normalizedPath}`;
}

function isRefreshRequest(url: string): boolean {
  return url.includes(REFRESH_PATH);
}

function buildHeaders(options?: ApiRequestInit): Headers {
  const headers = new Headers(options?.headers);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  const accessToken = getAccessToken();
  if (accessToken !== null && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return headers;
}

let refreshInFlight: Promise<string | null> | null = null;

export async function refreshAccessTokenFromCookie(): Promise<string | null> {
  if (refreshInFlight !== null) {
    return refreshInFlight;
  }

  refreshInFlight = (async (): Promise<string | null> => {
    try {
      const payload = await apiFetch<unknown>(REFRESH_PATH, {
        method: 'POST',
        skipAuthRefresh: true,
      });
      const parsed = refreshTokenResponseSchema.safeParse(payload);
      if (!parsed.success) {
        clearAccessToken();
        return null;
      }
      setAccessToken(parsed.data.accessToken);
      return parsed.data.accessToken;
    } catch {
      clearAccessToken();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function apiFetch<T>(
  url: string,
  options?: ApiRequestInit
): Promise<T> {
  const { skipAuthRefresh, ...requestInit } = options ?? {};
  const response = await fetch(resolveApiUrl(url), {
    ...requestInit,
    credentials: 'include',
    headers: buildHeaders(options),
  });

  if (
    response.status === 401 &&
    skipAuthRefresh !== true &&
    !isRefreshRequest(url)
  ) {
    const refreshed = await refreshAccessTokenFromCookie();
    if (refreshed !== null) {
      return apiFetch<T>(url, { ...options, skipAuthRefresh: true });
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
