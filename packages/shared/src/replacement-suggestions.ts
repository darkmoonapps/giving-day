export const REPLACEMENT_SUGGESTION_LIMIT = 5;

const ADDRESS_STOP_WORDS = new Set([
  'st',
  'street',
  'rd',
  'road',
  'ave',
  'avenue',
  'blvd',
  'boulevard',
  'way',
  'dr',
  'drive',
  'ln',
  'lane',
  'pl',
  'place',
  'רחוב',
  'רח',
  'שדרות',
  'שד',
  'דרך',
]);

export interface ReplacementVolunteerCandidate {
  id: string;
  firstName: string | null;
  lastName: string | null;
  homeArea: string | null;
}

export interface ElderProximityAddress {
  street: string;
  addressNotes: string | null;
}

export function rankReplacementSuggestions(
  elder: ElderProximityAddress,
  volunteers: readonly ReplacementVolunteerCandidate[],
  limit: number = REPLACEMENT_SUGGESTION_LIMIT
): ReplacementVolunteerCandidate[] {
  return [...volunteers]
    .sort((left, right) => {
      const scoreDelta =
        proximityScore(right.homeArea, elder) -
        proximityScore(left.homeArea, elder);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }
      const lastNameDelta = compareNames(left.lastName, right.lastName);
      if (lastNameDelta !== 0) {
        return lastNameDelta;
      }
      const firstNameDelta = compareNames(left.firstName, right.firstName);
      if (firstNameDelta !== 0) {
        return firstNameDelta;
      }
      return left.id.localeCompare(right.id);
    })
    .slice(0, limit);
}

export function proximityScore(
  homeArea: string | null,
  elder: ElderProximityAddress
): number {
  const area = normalize(homeArea ?? '');
  if (area.length === 0) {
    return 0;
  }

  const street = normalize(elder.street);
  const notes = normalize(elder.addressNotes ?? '');
  const haystack = [street, notes].filter((part) => part.length > 0).join(' ');

  if (
    area.length >= 3 &&
    haystack.length > 0 &&
    (haystack.includes(area) ||
      (haystack.length >= 3 && area.includes(haystack)))
  ) {
    return 3;
  }

  const elderTokens = new Set([
    ...tokensFrom(elder.street),
    ...tokensFrom(elder.addressNotes ?? ''),
  ]);
  for (const token of tokensFrom(homeArea ?? '')) {
    if (elderTokens.has(token)) {
      return 2;
    }
  }

  return 1;
}

function compareNames(left: string | null, right: string | null): number {
  return (left ?? '').localeCompare(right ?? '', 'he');
}

function tokensFrom(value: string): string[] {
  return normalize(value)
    .split(/\s+/)
    .filter((token) => token.length >= 2 && !ADDRESS_STOP_WORDS.has(token));
}

function normalize(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[''`״׳"]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
