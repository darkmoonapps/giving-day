import type { DeliveryStatus } from '@giving-day/shared';

export const UNASSIGNED_FILTER = 'unassigned';

export const DELIVERY_SORT_COLUMNS = [
  'elder',
  'address',
  'volunteer',
  'status',
] as const;

export type DeliverySortColumn = (typeof DELIVERY_SORT_COLUMNS)[number];
export type SortDirection = 'asc' | 'desc';

export interface DeliveryListFilters {
  elderName: string;
  address: string;
  volunteerId: string;
  status: string;
}

export interface DeliverySortState {
  column: DeliverySortColumn | null;
  direction: SortDirection;
}

export interface DeliveryListItem {
  id: string;
  status: DeliveryStatus;
  volunteerId?: string | null;
  volunteer?: {
    firstName: string | null;
    lastName: string | null;
  } | null;
  elder: {
    fullName: string;
    street: string;
    houseNumber: string;
    entrance: string | null;
    floor: string | null;
    apartment: string | null;
  };
}

export interface DeliveryListLabels {
  locale: string;
  unnamedElder: string;
  unnamedVolunteer: string;
  unassignedVolunteer: string;
  statusLabel: (status: DeliveryStatus) => string;
}

export const EMPTY_DELIVERY_FILTERS: DeliveryListFilters = {
  elderName: '',
  address: '',
  volunteerId: '',
  status: '',
};

export const DELIVERY_STATUS_I18N_KEYS = {
  unassigned: 'needs_volunteer',
  assigned: 'delivery_status_assigned',
  picked: 'delivery_status_picked',
  delivered: 'delivery_status_delivered',
  not_delivered: 'delivery_status_not_delivered',
  cancelled: 'delivery_status_cancelled',
} as const satisfies Record<
  DeliveryStatus,
  | 'needs_volunteer'
  | 'delivery_status_assigned'
  | 'delivery_status_picked'
  | 'delivery_status_delivered'
  | 'delivery_status_not_delivered'
  | 'delivery_status_cancelled'
>;

const STATUS_FILTER_ORDER: DeliveryStatus[] = [
  'unassigned',
  'assigned',
  'picked',
  'delivered',
  'not_delivered',
  'cancelled',
];

export function isUnassignedDelivery(delivery: DeliveryListItem): boolean {
  return delivery.volunteerId === null || delivery.volunteerId === undefined;
}

export function hasActiveDeliveryFilters(
  filters: DeliveryListFilters
): boolean {
  return (
    filters.elderName.trim().length > 0 ||
    filters.address.trim().length > 0 ||
    filters.volunteerId.length > 0 ||
    filters.status.length > 0
  );
}

export function cycleSortState(
  current: DeliverySortState,
  clicked: DeliverySortColumn
): DeliverySortState {
  if (current.column !== clicked) {
    return { column: clicked, direction: 'asc' };
  }
  if (current.direction === 'asc') {
    return { column: clicked, direction: 'desc' };
  }
  return { column: null, direction: 'asc' };
}

export function deliveryAddressText(delivery: DeliveryListItem): string {
  return [
    delivery.elder.street,
    delivery.elder.houseNumber,
    delivery.elder.entrance,
    delivery.elder.floor,
    delivery.elder.apartment,
  ]
    .filter(
      (part): part is string => typeof part === 'string' && part.length > 0
    )
    .join(' ');
}

export function deliveryElderName(
  delivery: DeliveryListItem,
  unnamedElder: string
): string {
  return delivery.elder.fullName.length > 0
    ? delivery.elder.fullName
    : unnamedElder;
}

export function deliveryVolunteerName(
  delivery: DeliveryListItem,
  labels: Pick<DeliveryListLabels, 'unnamedVolunteer' | 'unassignedVolunteer'>
): string {
  if (isUnassignedDelivery(delivery)) {
    return labels.unassignedVolunteer;
  }
  const name = [delivery.volunteer?.firstName, delivery.volunteer?.lastName]
    .filter(
      (part): part is string => typeof part === 'string' && part.length > 0
    )
    .join(' ');
  return name.length > 0 ? name : labels.unnamedVolunteer;
}

export function statusFilterValues(
  deliveries: readonly DeliveryListItem[]
): DeliveryStatus[] {
  const present = new Set<DeliveryStatus>(['unassigned']);
  for (const delivery of deliveries) {
    present.add(delivery.status);
  }
  return STATUS_FILTER_ORDER.filter((status) => present.has(status));
}

export function filterAndSortDeliveries<T extends DeliveryListItem>(
  deliveries: readonly T[],
  sort: DeliverySortState,
  filters: DeliveryListFilters,
  labels: DeliveryListLabels
): T[] {
  const filtered = deliveries.filter((delivery) =>
    matchesFilters(delivery, filters, labels)
  );

  if (sort.column === null) {
    return filtered;
  }

  const column = sort.column;
  const direction = sort.direction === 'asc' ? 1 : -1;
  return [...filtered].sort((left, right) => {
    const result = compareSortValues(left, right, column, labels);
    if (result !== 0) {
      return result * direction;
    }
    return left.id.localeCompare(right.id);
  });
}

function matchesFilters(
  delivery: DeliveryListItem,
  filters: DeliveryListFilters,
  labels: DeliveryListLabels
): boolean {
  if (
    !includesText(
      deliveryElderName(delivery, labels.unnamedElder),
      filters.elderName,
      labels.locale
    )
  ) {
    return false;
  }
  if (
    !includesText(deliveryAddressText(delivery), filters.address, labels.locale)
  ) {
    return false;
  }
  if (filters.volunteerId === UNASSIGNED_FILTER) {
    if (!isUnassignedDelivery(delivery)) {
      return false;
    }
  } else if (
    filters.volunteerId.length > 0 &&
    delivery.volunteerId !== filters.volunteerId
  ) {
    return false;
  }
  if (filters.status === UNASSIGNED_FILTER) {
    if (!isUnassignedDelivery(delivery) && delivery.status !== 'unassigned') {
      return false;
    }
  } else if (filters.status.length > 0 && delivery.status !== filters.status) {
    return false;
  }
  return true;
}

function compareSortValues(
  left: DeliveryListItem,
  right: DeliveryListItem,
  column: DeliverySortColumn,
  labels: DeliveryListLabels
): number {
  switch (column) {
    case 'elder':
      return compareText(
        deliveryElderName(left, labels.unnamedElder),
        deliveryElderName(right, labels.unnamedElder),
        labels.locale
      );
    case 'address':
      return compareText(
        deliveryAddressText(left),
        deliveryAddressText(right),
        labels.locale
      );
    case 'volunteer':
      return compareText(
        deliveryVolunteerName(left, labels),
        deliveryVolunteerName(right, labels),
        labels.locale
      );
    case 'status':
      return compareText(
        labels.statusLabel(left.status),
        labels.statusLabel(right.status),
        labels.locale
      );
  }
}

function includesText(
  haystack: string,
  needle: string,
  locale: string
): boolean {
  const query = needle.trim().toLocaleLowerCase(locale);
  if (query.length === 0) {
    return true;
  }
  return haystack.toLocaleLowerCase(locale).includes(query);
}

function compareText(left: string, right: string, locale: string): number {
  return left.localeCompare(right, locale, {
    sensitivity: 'base',
    numeric: true,
  });
}
