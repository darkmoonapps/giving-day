export const AUDIT_LOG_SORT_COLUMNS = [
  'at',
  'action',
  'entity',
  'entityId',
  'actorId',
] as const;

export type AuditLogSortColumn = (typeof AUDIT_LOG_SORT_COLUMNS)[number];
export type SortDirection = 'asc' | 'desc';

export interface AuditLogListItem {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  actorId: string;
  at: string;
}

export interface AuditLogListFilters {
  at: string;
  action: string;
  entity: string;
  entityId: string;
  actorId: string;
}

export interface AuditLogSortState {
  column: AuditLogSortColumn | null;
  direction: SortDirection;
}

export interface AuditLogListLabels {
  locale: string;
  actionLabel: (action: string) => string;
  entityLabel: (entity: string) => string;
  formatAt: (iso: string) => string;
}

export const EMPTY_AUDIT_LOG_FILTERS: AuditLogListFilters = {
  at: '',
  action: '',
  entity: '',
  entityId: '',
  actorId: '',
};

export function hasActiveAuditLogFilters(
  filters: AuditLogListFilters
): boolean {
  return (
    filters.at.trim().length > 0 ||
    filters.action.length > 0 ||
    filters.entity.length > 0 ||
    filters.entityId.trim().length > 0 ||
    filters.actorId.trim().length > 0
  );
}

export function cycleSortState(
  current: AuditLogSortState,
  clicked: AuditLogSortColumn
): AuditLogSortState {
  if (current.column !== clicked) {
    return { column: clicked, direction: 'asc' };
  }
  if (current.direction === 'asc') {
    return { column: clicked, direction: 'desc' };
  }
  return { column: null, direction: 'asc' };
}

export function actionFilterValues(
  entries: readonly AuditLogListItem[]
): string[] {
  return uniqueSorted(
    entries.map((entry) => entry.action),
    (left, right) => left.localeCompare(right)
  );
}

export function entityFilterValues(
  entries: readonly AuditLogListItem[]
): string[] {
  return uniqueSorted(
    entries.map((entry) => entry.entity),
    (left, right) => left.localeCompare(right)
  );
}

export function filterAndSortAuditLogs<T extends AuditLogListItem>(
  entries: readonly T[],
  sort: AuditLogSortState,
  filters: AuditLogListFilters,
  labels: AuditLogListLabels
): T[] {
  const filtered = entries.filter((entry) =>
    matchesFilters(entry, filters, labels)
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
  entry: AuditLogListItem,
  filters: AuditLogListFilters,
  labels: AuditLogListLabels
): boolean {
  if (!includesText(labels.formatAt(entry.at), filters.at, labels.locale)) {
    return false;
  }
  if (filters.action.length > 0 && entry.action !== filters.action) {
    return false;
  }
  if (filters.entity.length > 0 && entry.entity !== filters.entity) {
    return false;
  }
  if (!includesText(entry.entityId, filters.entityId, labels.locale)) {
    return false;
  }
  if (!includesText(entry.actorId, filters.actorId, labels.locale)) {
    return false;
  }
  return true;
}

function compareSortValues(
  left: AuditLogListItem,
  right: AuditLogListItem,
  column: AuditLogSortColumn,
  labels: AuditLogListLabels
): number {
  switch (column) {
    case 'at':
      return left.at.localeCompare(right.at);
    case 'action':
      return compareText(
        labels.actionLabel(left.action),
        labels.actionLabel(right.action),
        labels.locale
      );
    case 'entity':
      return compareText(
        labels.entityLabel(left.entity),
        labels.entityLabel(right.entity),
        labels.locale
      );
    case 'entityId':
      return compareText(left.entityId, right.entityId, labels.locale);
    case 'actorId':
      return compareText(left.actorId, right.actorId, labels.locale);
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

function uniqueSorted(
  values: readonly string[],
  compare: (left: string, right: string) => number
): string[] {
  return [...new Set(values)].sort(compare);
}
