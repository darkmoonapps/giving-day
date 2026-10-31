import { describe, expect, it } from 'vitest';
import type { DeliveryStatus } from '@giving-day/shared';
import {
  EMPTY_DELIVERY_FILTERS,
  UNASSIGNED_FILTER,
  cycleSortState,
  filterAndSortDeliveries,
  hasActiveDeliveryFilters,
  statusFilterValues,
  type DeliveryListItem,
  type DeliveryListLabels,
} from './delivery-list-query';

const labels: DeliveryListLabels = {
  locale: 'en',
  unnamedElder: 'Elder',
  unnamedVolunteer: 'Volunteer',
  unassignedVolunteer: 'Unassigned',
  statusLabel: (status: DeliveryStatus): string => status,
};

function item(
  overrides: Partial<DeliveryListItem> &
    Pick<DeliveryListItem, 'id' | 'status'> & {
      elder?: Partial<DeliveryListItem['elder']>;
    }
): DeliveryListItem {
  return {
    volunteerId: null,
    volunteer: null,
    ...overrides,
    elder: {
      fullName: 'Miriam Cohen',
      street: '8 Weizmann St',
      houseNumber: '8',
      entrance: null,
      floor: null,
      apartment: null,
      ...overrides.elder,
    },
  };
}

const miriam = item({
  id: '18181818-1818-4181-8181-181818181818',
  status: 'unassigned',
  elder: {
    fullName: 'Miriam Cohen',
    street: '8 Weizmann St',
    houseNumber: '8',
  },
});

const yosef = item({
  id: '17171717-1717-4171-8171-171717171717',
  status: 'unassigned',
  elder: { fullName: 'Yosef Abraham', street: '4 Park Ave', houseNumber: '4' },
});

const rivkah = item({
  id: '16161616-1616-4161-8161-161616161616',
  status: 'assigned',
  volunteerId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  volunteer: { firstName: 'Yonatan', lastName: 'Bar' },
  elder: {
    fullName: 'Rivkah Levi',
    street: '12 Example St',
    houseNumber: '12',
    entrance: 'B',
    floor: '3',
    apartment: '7',
  },
});

const rows = [rivkah, yosef, miriam];

describe('cycleSortState', () => {
  it('starts ascending on a new column, then descending, then clears', () => {
    const first = cycleSortState({ column: null, direction: 'asc' }, 'elder');
    expect(first).toEqual({ column: 'elder', direction: 'asc' });
    const second = cycleSortState(first, 'elder');
    expect(second).toEqual({ column: 'elder', direction: 'desc' });
    expect(cycleSortState(second, 'elder')).toEqual({
      column: null,
      direction: 'asc',
    });
  });

  it('resets to ascending when switching columns', () => {
    expect(
      cycleSortState({ column: 'elder', direction: 'desc' }, 'address')
    ).toEqual({ column: 'address', direction: 'asc' });
  });
});

describe('hasActiveDeliveryFilters', () => {
  it('is false for empty filters and true when any field is set', () => {
    expect(hasActiveDeliveryFilters(EMPTY_DELIVERY_FILTERS)).toBe(false);
    expect(
      hasActiveDeliveryFilters({ ...EMPTY_DELIVERY_FILTERS, elderName: '  ' })
    ).toBe(false);
    expect(
      hasActiveDeliveryFilters({
        ...EMPTY_DELIVERY_FILTERS,
        status: UNASSIGNED_FILTER,
      })
    ).toBe(true);
  });
});

describe('filterAndSortDeliveries', () => {
  it('filters elder name with case-insensitive contains', () => {
    const result = filterAndSortDeliveries(
      rows,
      { column: null, direction: 'asc' },
      { ...EMPTY_DELIVERY_FILTERS, elderName: 'miriam' },
      labels
    );
    expect(result.map((row) => row.id)).toEqual([miriam.id]);
  });

  it('filters address/area text so Holon streets are easy to find', () => {
    const result = filterAndSortDeliveries(
      rows,
      { column: null, direction: 'asc' },
      { ...EMPTY_DELIVERY_FILTERS, address: 'weizmann' },
      labels
    );
    expect(result.map((row) => row.elder.street)).toEqual(['8 Weizmann St']);
  });

  it('filters unassigned elders who need a volunteer', () => {
    const byStatus = filterAndSortDeliveries(
      rows,
      { column: 'elder', direction: 'asc' },
      { ...EMPTY_DELIVERY_FILTERS, status: UNASSIGNED_FILTER },
      labels
    );
    const byVolunteer = filterAndSortDeliveries(
      rows,
      { column: 'elder', direction: 'asc' },
      { ...EMPTY_DELIVERY_FILTERS, volunteerId: UNASSIGNED_FILTER },
      labels
    );
    expect(byStatus.map((row) => row.elder.fullName)).toEqual([
      'Miriam Cohen',
      'Yosef Abraham',
    ]);
    expect(byVolunteer.map((row) => row.id)).toEqual(
      byStatus.map((row) => row.id)
    );
  });

  it('filters by assigned volunteer id', () => {
    const result = filterAndSortDeliveries(
      rows,
      { column: null, direction: 'asc' },
      {
        ...EMPTY_DELIVERY_FILTERS,
        volunteerId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      },
      labels
    );
    expect(result.map((row) => row.id)).toEqual([rivkah.id]);
  });

  it('sorts by elder name ascending and descending', () => {
    const asc = filterAndSortDeliveries(
      rows,
      { column: 'elder', direction: 'asc' },
      EMPTY_DELIVERY_FILTERS,
      labels
    );
    const desc = filterAndSortDeliveries(
      rows,
      { column: 'elder', direction: 'desc' },
      EMPTY_DELIVERY_FILTERS,
      labels
    );
    expect(asc.map((row) => row.elder.fullName)).toEqual([
      'Miriam Cohen',
      'Rivkah Levi',
      'Yosef Abraham',
    ]);
    expect(desc.map((row) => row.elder.fullName)).toEqual([
      'Yosef Abraham',
      'Rivkah Levi',
      'Miriam Cohen',
    ]);
  });

  it('preserves the original order when no sort is selected', () => {
    const result = filterAndSortDeliveries(
      rows,
      { column: null, direction: 'asc' },
      EMPTY_DELIVERY_FILTERS,
      labels
    );
    expect(result.map((row) => row.id)).toEqual(rows.map((row) => row.id));
  });

  it('sorts by address, volunteer, and localized status', () => {
    const byAddress = filterAndSortDeliveries(
      rows,
      { column: 'address', direction: 'asc' },
      EMPTY_DELIVERY_FILTERS,
      labels
    );
    expect(byAddress.map((row) => row.elder.street)).toEqual([
      '4 Park Ave',
      '8 Weizmann St',
      '12 Example St',
    ]);

    const byVolunteer = filterAndSortDeliveries(
      rows,
      { column: 'volunteer', direction: 'asc' },
      EMPTY_DELIVERY_FILTERS,
      labels
    );
    expect(byVolunteer.map((row) => row.id)).toEqual([
      yosef.id,
      miriam.id,
      rivkah.id,
    ]);

    const byStatus = filterAndSortDeliveries(
      rows,
      { column: 'status', direction: 'asc' },
      EMPTY_DELIVERY_FILTERS,
      labels
    );
    expect(byStatus[0]?.status).toBe('assigned');
    expect(byStatus.slice(1).every((row) => row.status === 'unassigned')).toBe(
      true
    );
  });

  it('uses fallback names and filters assigned status', () => {
    const unnamed = item({
      id: '20202020-2020-4202-8202-202020202020',
      status: 'picked',
      volunteerId: 'cccccccccccccccc-cccc-4ccc-8ccc-cccccccccccc',
      volunteer: { firstName: null, lastName: null },
      elder: { fullName: '', street: 'Golda Meir St', houseNumber: '3' },
    });
    const sorted = filterAndSortDeliveries(
      [unnamed, rivkah],
      { column: 'elder', direction: 'asc' },
      EMPTY_DELIVERY_FILTERS,
      labels
    );
    expect(sorted.map((row) => row.id)).toEqual([unnamed.id, rivkah.id]);

    const assignedOnly = filterAndSortDeliveries(
      [unnamed, rivkah, yosef],
      { column: null, direction: 'asc' },
      { ...EMPTY_DELIVERY_FILTERS, status: 'assigned' },
      labels
    );
    expect(assignedOnly.map((row) => row.id)).toEqual([rivkah.id]);
  });
});

describe('statusFilterValues', () => {
  it('always includes needs-a-volunteer and the statuses present in the list', () => {
    expect(statusFilterValues(rows)).toEqual(['unassigned', 'assigned']);
  });
});
