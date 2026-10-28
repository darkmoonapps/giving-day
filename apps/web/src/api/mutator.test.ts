import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearAccessToken, setAccessToken } from '../auth/access-token';
import { mockEmptyResponse, mockJsonResponse } from '../test/auth-fixtures';
import { ApiError, apiFetch, resolveApiUrl } from './mutator';

describe('resolveApiUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('keeps relative URLs when VITE_API_URL is unset', () => {
    vi.stubEnv('VITE_API_URL', '');
    expect(resolveApiUrl('/api/health')).toBe('/api/health');
  });

  it('prefixes relative URLs with VITE_API_URL', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.test/');
    expect(resolveApiUrl('/api/health')).toBe(
      'https://api.example.test/api/health'
    );
  });

  it('leaves absolute URLs unchanged', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.test');
    expect(resolveApiUrl('https://other.example.test/api/health')).toBe(
      'https://other.example.test/api/health'
    );
  });
});

describe('apiFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    clearAccessToken();
  });

  it('requests the resolved API URL with credentials', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.test');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(mockJsonResponse({ ok: true }))
    );

    const result = await apiFetch<{ ok: boolean }>('/api/health');

    expect(result).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.test/api/health',
      expect.objectContaining({
        credentials: 'include',
        headers: expect.any(Headers),
      })
    );
  });

  it('sends a stored access token as a Bearer header', async () => {
    setAccessToken('memory-token');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(mockJsonResponse({ user: { id: '1' } }))
    );

    await apiFetch('/api/auth/me');

    const init = vi.mocked(fetch).mock.calls[0]?.[1];
    const headers = new Headers(init?.headers);
    expect(headers.get('Authorization')).toBe('Bearer memory-token');
  });

  it('refreshes once after a 401 and retries the original request', async () => {
    setAccessToken('expired-token');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(mockEmptyResponse(401))
        .mockResolvedValueOnce(mockJsonResponse({ accessToken: 'next-token' }))
        .mockResolvedValueOnce(mockJsonResponse({ ok: true }))
    );

    const result = await apiFetch<{ ok: boolean }>('/api/health');

    expect(result).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(3);
    const retryInit = vi.mocked(fetch).mock.calls[2]?.[1];
    const retryHeaders = new Headers(retryInit?.headers);
    expect(retryHeaders.get('Authorization')).toBe('Bearer next-token');
  });

  it('throws ApiError on a non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockEmptyResponse(503)));

    await expect(apiFetch('/api/health')).rejects.toBeInstanceOf(ApiError);
  });
});
