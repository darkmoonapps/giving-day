import { describe, expect, it } from 'vitest';
import {
  EMPTY_AUDIT_LOG_FILTERS,
  actionFilterValues,
  cycleSortState,
  entityFilterValues,
  filterAndSortAuditLogs,
  hasActiveAuditLogFilters,
  type AuditLogListItem,
  type AuditLogListLabels,
} from './audit-log-list-query';

const labels: AuditLogListLabels = {
  locale: 'en',
  actionLabel: (action) => action,
  entityLabel: (entity) => entity,
  formatAt: (iso) => iso,
};

function entry(
  overrides: Partial<AuditLogListItem> & Pick<AuditLogListItem, 'id' | 'action'>
): AuditLogListItem {
  return {
    actorId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    entity: 'membership',
    entityId: '99999999-9999-4999-8999-999999999999',
    at: '2026-11-13T10:00:00.000Z',
    ...overrides,
  };
}

const approve = entry({
  id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  action: 'membership.approve',
  entity: 'membership',
  entityId: '99999999-9999-4999-8999-999999999999',
  at: '2026-11-13T10:00:00.000Z',
});

const assign = entry({
  id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
  action: 'delivery.assign',
  entity: 'delivery',
  entityId: '16161616-1616-4161-8161-161616161616',
  actorId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  at: '2026-11-13T09:00:00.000Z',
});

const publish = entry({
  id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  action: 'distribution_day.publish',
  entity: 'distribution_day',
  entityId: '33333333-3333-4333-8333-333333333333',
  at: '2026-11-13T08:00:00.000Z',
});

const rows = [approve, assign, publish];

describe('cycleSortState', () => {
  it('starts ascending on a new column, then descending, then clears', () => {
    const first = cycleSortState({ column: null, direction: 'asc' }, 'action');
    expect(first).toEqual({ column: 'action', direction: 'asc' });
    const second = cycleSortState(first, 'action');
    expect(second).toEqual({ column: 'action', direction: 'desc' });
    expect(cycleSortState(second, 'action')).toEqual({
      column: null,
      direction: 'asc',
    });
  });

  it('resets to ascending when switching columns', () => {
    expect(
      cycleSortState({ column: 'action', direction: 'desc' }, 'entity')
    ).toEqual({ column: 'entity', direction: 'asc' });
  });
});

describe('hasActiveAuditLogFilters', () => {
  it('is false for empty filters and true when any field is set', () => {
    expect(hasActiveAuditLogFilters(EMPTY_AUDIT_LOG_FILTERS)).toBe(false);
    expect(
      hasActiveAuditLogFilters({ ...EMPTY_AUDIT_LOG_FILTERS, at: '  ' })
    ).toBe(false);
    expect(
      hasActiveAuditLogFilters({
        ...EMPTY_AUDIT_LOG_FILTERS,
        action: 'delivery.assign',
      })
    ).toBe(true);
  });
});

describe('actionFilterValues and entityFilterValues', () => {
  it('returns unique sorted values from the page', () => {
    expect(actionFilterValues(rows)).toEqual([
      'delivery.assign',
      'distribution_day.publish',
      'membership.approve',
    ]);
    expect(entityFilterValues(rows)).toEqual([
      'delivery',
      'distribution_day',
      'membership',
    ]);
  });
});

describe('filterAndSortAuditLogs', () => {
  it('filters action exactly and entity id with contains', () => {
    const byAction = filterAndSortAuditLogs(
      rows,
      { column: null, direction: 'asc' },
      { ...EMPTY_AUDIT_LOG_FILTERS, action: 'delivery.assign' },
      labels
    );
    expect(byAction.map((row) => row.id)).toEqual([assign.id]);

    const byEntityId = filterAndSortAuditLogs(
      rows,
      { column: null, direction: 'asc' },
      { ...EMPTY_AUDIT_LOG_FILTERS, entityId: '1616' },
      labels
    );
    expect(byEntityId.map((row) => row.id)).toEqual([assign.id]);
  });

  it('sorts by action label ascending then descending', () => {
    const ascending = filterAndSortAuditLogs(
      rows,
      { column: 'action', direction: 'asc' },
      EMPTY_AUDIT_LOG_FILTERS,
      labels
    );
    expect(ascending.map((row) => row.action)).toEqual([
      'delivery.assign',
      'distribution_day.publish',
      'membership.approve',
    ]);

    const descending = filterAndSortAuditLogs(
      rows,
      { column: 'action', direction: 'desc' },
      EMPTY_AUDIT_LOG_FILTERS,
      labels
    );
    expect(descending.map((row) => row.action)).toEqual([
      'membership.approve',
      'distribution_day.publish',
      'delivery.assign',
    ]);
  });

  it('sorts by at timestamp', () => {
    const ascending = filterAndSortAuditLogs(
      rows,
      { column: 'at', direction: 'asc' },
      EMPTY_AUDIT_LOG_FILTERS,
      labels
    );
    expect(ascending.map((row) => row.id)).toEqual([
      publish.id,
      assign.id,
      approve.id,
    ]);
  });

  it('filters formatted at text with contains', () => {
    const withFormatted: AuditLogListLabels = {
      ...labels,
      formatAt: (iso) =>
        iso.startsWith('2026-11-13T10') ? '13 Nov 10:00' : iso,
    };
    const result = filterAndSortAuditLogs(
      rows,
      { column: null, direction: 'asc' },
      { ...EMPTY_AUDIT_LOG_FILTERS, at: '10:00' },
      withFormatted
    );
    expect(result.map((row) => row.id)).toEqual([approve.id]);
  });
});
