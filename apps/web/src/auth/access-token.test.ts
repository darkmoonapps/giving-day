import { afterEach, describe, expect, it } from 'vitest';
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from './access-token';

describe('access token memory store', () => {
  afterEach(() => {
    clearAccessToken();
  });

  it('stores and clears an access token in memory', () => {
    expect(getAccessToken()).toBeNull();
    setAccessToken('header.payload.sig');
    expect(getAccessToken()).toBe('header.payload.sig');
    clearAccessToken();
    expect(getAccessToken()).toBeNull();
  });
});
