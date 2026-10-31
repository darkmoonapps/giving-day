import type { CityPendingMembershipsResponseDto } from '../api/generated/api';

export function membershipDisplayName(
  firstName: string | null,
  lastName: string | null,
  fallback: string
): string {
  const name = [firstName, lastName]
    .filter(
      (part): part is string =>
        typeof part === 'string' && part.trim().length > 0
    )
    .map((part) => part.trim())
    .join(' ');
  return name.length > 0 ? name : fallback;
}

export function formatMembershipRequestDate(
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

export function removePendingMembership(
  current: CityPendingMembershipsResponseDto | undefined,
  membershipId: string
): CityPendingMembershipsResponseDto | undefined {
  if (current === undefined) {
    return current;
  }

  return {
    memberships: current.memberships.filter(
      (membership) => membership.membershipId !== membershipId
    ),
  };
}
