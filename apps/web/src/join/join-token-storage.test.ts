import { afterEach, describe, expect, it } from 'vitest';
import {
  JOIN_TOKEN_STORAGE_KEY,
  clearPersistedJoinToken,
  isJoinTokenFormatValid,
  joinPath,
  persistJoinToken,
  postAuthPath,
  readPersistedJoinToken,
} from './join-token-storage';

describe('join token storage', () => {
  afterEach(() => {
    clearPersistedJoinToken();
  });

  it('rejects empty and oversized tokens', () => {
    expect(isJoinTokenFormatValid('')).toBe(false);
    expect(isJoinTokenFormatValid('   ')).toBe(false);
    expect(isJoinTokenFormatValid('fake-join-token')).toBe(true);
    expect(isJoinTokenFormatValid('a'.repeat(129))).toBe(false);
  });

  it('persists a token across login and onboarding redirects', () => {
    persistJoinToken('  fake-join-token  ');

    expect(sessionStorage.getItem(JOIN_TOKEN_STORAGE_KEY)).toBe(
      'fake-join-token'
    );
    expect(readPersistedJoinToken()).toBe('fake-join-token');
    expect(postAuthPath()).toBe('/join/fake-join-token');
    expect(joinPath('fake-join-token')).toBe('/join/fake-join-token');
  });

  it('falls back to home when no join token is stored', () => {
    expect(readPersistedJoinToken()).toBeNull();
    expect(postAuthPath()).toBe('/');
    expect(postAuthPath('/onboarding')).toBe('/onboarding');
  });
});
