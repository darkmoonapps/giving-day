export const JOIN_TOKEN_STORAGE_KEY = 'giving-day.join-token';

const MAX_JOIN_TOKEN_LENGTH = 128;

export function isJoinTokenFormatValid(token: string): boolean {
  const trimmed = token.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_JOIN_TOKEN_LENGTH;
}

export function persistJoinToken(token: string): void {
  if (typeof sessionStorage === 'undefined' || !isJoinTokenFormatValid(token)) {
    return;
  }

  sessionStorage.setItem(JOIN_TOKEN_STORAGE_KEY, token.trim());
}

export function readPersistedJoinToken(): string | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }

  const value = sessionStorage.getItem(JOIN_TOKEN_STORAGE_KEY);
  if (value === null || !isJoinTokenFormatValid(value)) {
    return null;
  }

  return value.trim();
}

export function clearPersistedJoinToken(): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  sessionStorage.removeItem(JOIN_TOKEN_STORAGE_KEY);
}

export function joinPath(token: string): string {
  return `/join/${encodeURIComponent(token.trim())}`;
}

export function postAuthPath(fallback = '/'): string {
  const token = readPersistedJoinToken();
  return token === null ? fallback : joinPath(token);
}
