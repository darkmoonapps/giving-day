export class ApiError extends Error {
  public readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
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

export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(resolveApiUrl(url), {
    ...options,
    headers: {
      Accept: 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
