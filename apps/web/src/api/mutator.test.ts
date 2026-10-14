import { afterEach, describe, expect, it, vi } from 'vitest';
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
  });

  it('requests the resolved API URL', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.test');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      })
    );

    const result = await apiFetch<{ ok: boolean }>('/api/health');

    expect(result).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.test/api/health',
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: 'application/json' }),
      })
    );
  });

  it('throws ApiError on a non-OK response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      })
    );

    await expect(apiFetch('/api/health')).rejects.toBeInstanceOf(ApiError);
  });
});
