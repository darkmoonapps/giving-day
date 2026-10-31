import type { CityRole } from '@giving-day/shared';
import type { CityJoinLinkStatusDto } from '../api/generated/api';

export const JOIN_LINK_STORAGE_PREFIX = 'giving-day.join-link-url';

export const JOIN_LINK_ROLES: readonly CityRole[] = [
  'volunteer',
  'coordinator',
];

export interface RevealedJoinLink {
  url: string;
  createdAt: string;
}

export function joinLinkStorageKey(cityId: string, role: CityRole): string {
  return `${JOIN_LINK_STORAGE_PREFIX}:${cityId}:${role}`;
}

function isRevealedJoinLink(value: unknown): value is RevealedJoinLink {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  if (!('url' in value) || !('createdAt' in value)) {
    return false;
  }
  return (
    typeof value.url === 'string' &&
    value.url.length > 0 &&
    typeof value.createdAt === 'string' &&
    value.createdAt.length > 0
  );
}

export function readRevealedJoinLink(
  cityId: string,
  role: CityRole
): RevealedJoinLink | null {
  try {
    const raw = window.localStorage.getItem(joinLinkStorageKey(cityId, role));
    if (raw === null || raw.length === 0) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    return isRevealedJoinLink(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeRevealedJoinLink(
  cityId: string,
  role: CityRole,
  revealed: RevealedJoinLink
): void {
  try {
    window.localStorage.setItem(
      joinLinkStorageKey(cityId, role),
      JSON.stringify(revealed)
    );
  } catch {
    // Private mode or quota — the URL is still shown from component state.
  }
}

export function clearRevealedJoinLink(cityId: string, role: CityRole): void {
  try {
    window.localStorage.removeItem(joinLinkStorageKey(cityId, role));
  } catch {
    // Ignore storage failures.
  }
}

export function clearAllRevealedJoinLinks(): void {
  try {
    const keys: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key !== null && key.startsWith(`${JOIN_LINK_STORAGE_PREFIX}:`)) {
        keys.push(key);
      }
    }
    for (const key of keys) {
      window.localStorage.removeItem(key);
    }
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

export function revealedJoinLinkMatchesStatus(
  stored: RevealedJoinLink | null,
  status: CityJoinLinkStatusDto | undefined
): boolean {
  return (
    stored !== null &&
    status?.active === true &&
    status.createdAt !== null &&
    stored.createdAt === status.createdAt
  );
}

export function visibleJoinLinkUrl(
  stored: RevealedJoinLink | null,
  status: CityJoinLinkStatusDto | undefined
): string | null {
  if (!revealedJoinLinkMatchesStatus(stored, status)) {
    return null;
  }
  return stored?.url ?? null;
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
