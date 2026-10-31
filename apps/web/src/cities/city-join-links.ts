import type { CityRole } from '@giving-day/shared';
import type { CityJoinLinkStatusDto } from '../api/generated/api';

const STORAGE_PREFIX = 'giving-day.join-link-url';

export const JOIN_LINK_ROLES: readonly CityRole[] = [
  'volunteer',
  'coordinator',
];

export function joinLinkStorageKey(cityId: string, role: CityRole): string {
  return `${STORAGE_PREFIX}:${cityId}:${role}`;
}

export function readRevealedJoinLinkUrl(
  cityId: string,
  role: CityRole
): string | null {
  try {
    const value = window.localStorage.getItem(joinLinkStorageKey(cityId, role));
    return value !== null && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export function writeRevealedJoinLinkUrl(
  cityId: string,
  role: CityRole,
  url: string
): void {
  try {
    window.localStorage.setItem(joinLinkStorageKey(cityId, role), url);
  } catch {
    // Private mode or quota — the URL is still shown from component state.
  }
}

export function clearRevealedJoinLinkUrl(cityId: string, role: CityRole): void {
  try {
    window.localStorage.removeItem(joinLinkStorageKey(cityId, role));
  } catch {
    // Ignore storage failures.
  }
}

export function joinLinkForRole(
  links: CityJoinLinkStatusDto[] | undefined,
  role: CityRole
): CityJoinLinkStatusDto | undefined {
  return links?.find((link) => link.role === role);
}

export function visibleJoinLinkUrl(
  active: boolean,
  storedUrl: string | null
): string | null {
  if (!active || storedUrl === null || storedUrl.length === 0) {
    return null;
  }
  return storedUrl;
}

export function formatJoinLinkCreatedAt(
  value: string,
  language: string
): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(language, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

export async function copyText(value: string): Promise<boolean> {
  const clipboard = navigator.clipboard;
  if (clipboard === undefined || typeof clipboard.writeText !== 'function') {
    return false;
  }

  try {
    await clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}
