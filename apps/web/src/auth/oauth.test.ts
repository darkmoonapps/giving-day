import { afterEach, describe, expect, it, vi } from 'vitest';
import { getOAuthStartUrl, startOAuthLogin } from './oauth';

describe('oauth start URLs', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('uses generated Google and Facebook auth paths', () => {
    vi.stubEnv('VITE_API_URL', '');
    expect(getOAuthStartUrl('google')).toBe('/api/auth/google');
    expect(getOAuthStartUrl('facebook')).toBe('/api/auth/facebook');
  });

  it('prefixes OAuth start URLs with VITE_API_URL', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.test');
    expect(getOAuthStartUrl('google')).toBe(
      'https://api.example.test/api/auth/google'
    );
  });

  it('navigates the browser to the provider start URL', () => {
    vi.stubEnv('VITE_API_URL', '');
    const assign = vi.fn();
    vi.stubGlobal('location', { assign });

    startOAuthLogin('facebook');

    expect(assign).toHaveBeenCalledWith('/api/auth/facebook');
  });
});
