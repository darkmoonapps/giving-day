import { afterEach, describe, expect, it, vi } from 'vitest';
import { CITY_A_ID } from '../test/distribution-day-fixtures';
import {
  JOIN_LINK_STORAGE_PREFIX,
  clearAllRevealedJoinLinks,
  clearRevealedJoinLink,
  copyText,
  formatJoinLinkCreatedAt,
  joinLinkForRole,
  joinLinkStorageKey,
  readRevealedJoinLink,
  revealedJoinLinkMatchesStatus,
  visibleJoinLinkUrl,
  writeRevealedJoinLink,
  type RevealedJoinLink,
} from './city-join-links';

const HOLON_URL = 'http://localhost:3000/join/fake-holon-volunteer-token';
const HOLON_CREATED_AT = '2026-10-01T09:00:00.000Z';
const HOLON_REVEALED: RevealedJoinLink = {
  url: HOLON_URL,
  createdAt: HOLON_CREATED_AT,
};

describe('join-link helpers', () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('stores and reads a revealed Holon volunteer URL with its generation', () => {
    expect(readRevealedJoinLink(CITY_A_ID, 'volunteer')).toBeNull();
    writeRevealedJoinLink(CITY_A_ID, 'volunteer', HOLON_REVEALED);
    expect(readRevealedJoinLink(CITY_A_ID, 'volunteer')).toEqual(
      HOLON_REVEALED
    );
    expect(readRevealedJoinLink(CITY_A_ID, 'coordinator')).toBeNull();
    expect(joinLinkStorageKey(CITY_A_ID, 'volunteer')).toContain(
      JOIN_LINK_STORAGE_PREFIX
    );
  });

  it('ignores a leftover URL string that has no generation', () => {
    window.localStorage.setItem(
      joinLinkStorageKey(CITY_A_ID, 'volunteer'),
      HOLON_URL
    );
    expect(readRevealedJoinLink(CITY_A_ID, 'volunteer')).toBeNull();
  });

  it('clears a stored URL', () => {
    writeRevealedJoinLink(CITY_A_ID, 'volunteer', HOLON_REVEALED);
    clearRevealedJoinLink(CITY_A_ID, 'volunteer');
    expect(readRevealedJoinLink(CITY_A_ID, 'volunteer')).toBeNull();
  });

  it('clears every remembered join-link key', () => {
    writeRevealedJoinLink(CITY_A_ID, 'volunteer', HOLON_REVEALED);
    writeRevealedJoinLink(CITY_A_ID, 'coordinator', {
      url: 'http://localhost:3000/join/fake-holon-coordinator-token',
      createdAt: '2026-10-31T12:05:00.000Z',
    });
    window.localStorage.setItem('unrelated-key', 'keep');

    clearAllRevealedJoinLinks();

    expect(readRevealedJoinLink(CITY_A_ID, 'volunteer')).toBeNull();
    expect(readRevealedJoinLink(CITY_A_ID, 'coordinator')).toBeNull();
    expect(window.localStorage.getItem('unrelated-key')).toBe('keep');
  });

  it('shows a stored URL only when it matches the current active generation', () => {
    const matching = {
      role: 'volunteer' as const,
      active: true,
      createdAt: HOLON_CREATED_AT,
      usedCount: 2,
    };
    const rotated = {
      ...matching,
      createdAt: '2026-10-31T12:00:00.000Z',
    };

    expect(visibleJoinLinkUrl(HOLON_REVEALED, matching)).toBe(HOLON_URL);
    expect(revealedJoinLinkMatchesStatus(HOLON_REVEALED, matching)).toBe(true);
    expect(visibleJoinLinkUrl(HOLON_REVEALED, rotated)).toBeNull();
    expect(revealedJoinLinkMatchesStatus(HOLON_REVEALED, rotated)).toBe(false);
    expect(
      visibleJoinLinkUrl(HOLON_REVEALED, {
        ...matching,
        active: false,
      })
    ).toBeNull();
    expect(visibleJoinLinkUrl(null, matching)).toBeNull();
    expect(visibleJoinLinkUrl(HOLON_REVEALED, undefined)).toBeNull();
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
        createdAt: HOLON_CREATED_AT,
        usedCount: 2,
      },
    ];

    expect(joinLinkForRole(links, 'volunteer')?.usedCount).toBe(2);
    expect(joinLinkForRole(links, 'coordinator')?.active).toBe(false);
    expect(joinLinkForRole(undefined, 'volunteer')).toBeUndefined();
  });

  it('formats an ISO timestamp in English and returns invalid values as-is', () => {
    const formatted = formatJoinLinkCreatedAt(HOLON_CREATED_AT, 'en');
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
