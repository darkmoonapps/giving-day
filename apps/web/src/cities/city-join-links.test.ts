import { afterEach, describe, expect, it, vi } from 'vitest';
import { CITY_A_ID } from '../test/distribution-day-fixtures';
import {
  clearRevealedJoinLinkUrl,
  copyText,
  formatJoinLinkCreatedAt,
  joinLinkForRole,
  joinLinkStorageKey,
  readRevealedJoinLinkUrl,
  visibleJoinLinkUrl,
  writeRevealedJoinLinkUrl,
} from './city-join-links';

const HOLON_URL = 'http://localhost:3000/join/fake-holon-volunteer-token';

describe('join-link helpers', () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('stores and reads a revealed Holon volunteer URL', () => {
    expect(readRevealedJoinLinkUrl(CITY_A_ID, 'volunteer')).toBeNull();
    writeRevealedJoinLinkUrl(CITY_A_ID, 'volunteer', HOLON_URL);
    expect(readRevealedJoinLinkUrl(CITY_A_ID, 'volunteer')).toBe(HOLON_URL);
    expect(readRevealedJoinLinkUrl(CITY_A_ID, 'coordinator')).toBeNull();
    expect(joinLinkStorageKey(CITY_A_ID, 'volunteer')).toContain(CITY_A_ID);
  });

  it('clears a stored URL', () => {
    writeRevealedJoinLinkUrl(CITY_A_ID, 'volunteer', HOLON_URL);
    clearRevealedJoinLinkUrl(CITY_A_ID, 'volunteer');
    expect(readRevealedJoinLinkUrl(CITY_A_ID, 'volunteer')).toBeNull();
  });

  it('hides a stored URL when the link is no longer active', () => {
    expect(visibleJoinLinkUrl(true, HOLON_URL)).toBe(HOLON_URL);
    expect(visibleJoinLinkUrl(false, HOLON_URL)).toBeNull();
    expect(visibleJoinLinkUrl(true, null)).toBeNull();
    expect(visibleJoinLinkUrl(true, '')).toBeNull();
  });

  it('finds the volunteer or coordinator status row', () => {
    const links = [
      {
        role: 'coordinator' as const,
        active: false,
        createdAt: null,
        usedCount: 0,
      },
      {
        role: 'volunteer' as const,
        active: true,
        createdAt: '2026-10-01T09:00:00.000Z',
        usedCount: 2,
      },
    ];

    expect(joinLinkForRole(links, 'volunteer')?.usedCount).toBe(2);
    expect(joinLinkForRole(links, 'coordinator')?.active).toBe(false);
    expect(joinLinkForRole(undefined, 'volunteer')).toBeUndefined();
  });

  it('formats an ISO timestamp in English and returns invalid values as-is', () => {
    const formatted = formatJoinLinkCreatedAt('2026-10-01T09:00:00.000Z', 'en');
    expect(formatted).toContain('2026');
    expect(formatted).toContain('1');
    expect(formatJoinLinkCreatedAt('not-a-date', 'he')).toBe('not-a-date');
  });

  it('copies text with the clipboard API', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    await expect(copyText(HOLON_URL)).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith(HOLON_URL);
  });

  it('returns false when the clipboard API is missing or rejects', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    await expect(copyText(HOLON_URL)).resolves.toBe(false);

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error('denied')),
      },
    });
    await expect(copyText(HOLON_URL)).resolves.toBe(false);
  });
});
