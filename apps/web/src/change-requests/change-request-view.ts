import type { ElderChangeRequestsResponseDto } from '../api/generated/api';

export const CHANGE_REQUEST_SCALAR_FIELDS = [
  'street',
  'houseNumber',
  'entrance',
  'floor',
  'apartment',
  'addressNotes',
  'notes',
] as const;

export type ChangeRequestScalarField =
  (typeof CHANGE_REQUEST_SCALAR_FIELDS)[number];

export const CHANGE_REQUEST_FIELD_LABEL_KEYS = {
  street: 'field_street',
  houseNumber: 'field_houseNumber',
  entrance: 'field_entrance',
  floor: 'field_floor',
  apartment: 'field_apartment',
  addressNotes: 'field_addressNotes',
  notes: 'field_notes',
  contacts: 'field_contacts',
} as const;

export function pendingElderIds(
  requests: ReadonlyArray<{ elderId: string; status: string }>
): ReadonlySet<string> {
  return new Set(
    requests
      .filter((request) => request.status === 'pending')
      .map((request) => request.elderId)
  );
}

export function removeChangeRequest(
  current: ElderChangeRequestsResponseDto | undefined,
  requestId: string
): ElderChangeRequestsResponseDto | undefined {
  if (current === undefined) {
    return current;
  }

  return {
    changeRequests: current.changeRequests.filter(
      (request) => request.id !== requestId
    ),
  };
}

export function personDisplayName(
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

export function displayNullableValue(
  value: string | null | undefined,
  emptyLabel: string
): string {
  if (value === null || value === undefined || value.trim().length === 0) {
    return emptyLabel;
  }
  return value;
}
