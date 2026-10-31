import { AppBadge, AppButton, AppText } from '@giving-day/ui';
import {
  Group,
  NativeSelect,
  Stack,
  Table,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import {
  IconChevronDown,
  IconChevronUp,
  IconSelector,
} from '@tabler/icons-react';
import type { TFunction } from 'i18next';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  DeliveryResponseDto,
  DeliveryVolunteerDto,
} from '../api/generated/api';
import { useLanguage } from '../i18n/use-language';
import { ElderAddress } from './elder-address';
import {
  DELIVERY_SORT_COLUMNS,
  DELIVERY_STATUS_I18N_KEYS,
  EMPTY_DELIVERY_FILTERS,
  UNASSIGNED_FILTER,
  cycleSortState,
  deliveryVolunteerName,
  filterAndSortDeliveries,
  hasActiveDeliveryFilters,
  isUnassignedDelivery,
  statusFilterValues,
  type DeliveryListFilters,
  type DeliveryListLabels,
  type DeliverySortColumn,
  type DeliverySortState,
} from './delivery-list-query';

const ASSIGN_UNASSIGNED_VALUE = '';

export function CoordinatorDeliveriesTable({
  deliveries,
  assignableVolunteers,
  unassignedCount,
  assignPending,
  initialFilters = EMPTY_DELIVERY_FILTERS,
  onAssign,
}: {
  deliveries: DeliveryResponseDto[];
  assignableVolunteers: DeliveryVolunteerDto[];
  unassignedCount: number;
  assignPending: boolean;
  initialFilters?: DeliveryListFilters;
  onAssign: (deliveryId: string, volunteerId: string | null) => void;
}): JSX.Element {
  const { language } = useLanguage();
  const { t } = useTranslation('admin');
  const [sort, setSort] = useState<DeliverySortState>({
    column: null,
    direction: 'asc',
  });
  const [filters, setFilters] = useState<DeliveryListFilters>(initialFilters);
  const labels = useMemo<DeliveryListLabels>(
    () => ({
      locale: language,
      unnamedElder: t('unnamed_elder'),
      unnamedVolunteer: t('unnamed_volunteer'),
      unassignedVolunteer: t('unassigned'),
      statusLabel: (status) => t(DELIVERY_STATUS_I18N_KEYS[status]),
    }),
    [language, t]
  );
  const addressLabels = {
    entrance: t('entrance_label'),
    floor: t('floor_label'),
    apartment: t('apartment_label'),
  };
  const visibleDeliveries = useMemo(
    () => filterAndSortDeliveries(deliveries, sort, filters, labels),
    [deliveries, filters, labels, sort]
  );
  const volunteerOptions = useMemo(
    () => volunteerFilterOptions(deliveries, assignableVolunteers, labels),
    [assignableVolunteers, deliveries, labels]
  );
  const statusOptions = statusFilterValues(deliveries).map((status) => ({
    value: status,
    label: t(DELIVERY_STATUS_I18N_KEYS[status]),
  }));
  const filtersActive = hasActiveDeliveryFilters(filters);

  const updateFilter = (
    key: keyof DeliveryListFilters,
    value: string
  ): void => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <Stack gap="sm">
      {unassignedCount > 0 || filtersActive ? (
        <Group justify="space-between" align="center" wrap="wrap">
          {unassignedCount > 0 ? (
            <UnstyledButton
              type="button"
              onClick={() => {
                updateFilter(
                  'status',
                  filters.status === UNASSIGNED_FILTER ? '' : UNASSIGNED_FILTER
                );
              }}
              aria-pressed={filters.status === UNASSIGNED_FILTER}
              aria-label={t('filter_unassigned_toggle')}
              data-testid="needs-volunteer-count"
            >
              <AppBadge color="yellow">
                {t('unassigned_count', { count: unassignedCount })}
              </AppBadge>
            </UnstyledButton>
          ) : (
            <span />
          )}
          {filtersActive ? (
            <AppButton
              size="xs"
              variant="light"
              data-testid="clear-delivery-filters"
              onClick={() => {
                setFilters(EMPTY_DELIVERY_FILTERS);
              }}
            >
              {t('filter_clear')}
            </AppButton>
          ) : null}
        </Group>
      ) : null}

      <AppText c="dimmed" size="sm" data-testid="deliveries-filter-count">
        {t('filter_showing', {
          shown: visibleDeliveries.length,
          total: deliveries.length,
        })}
      </AppText>

      <Table.ScrollContainer minWidth={720}>
        <Table highlightOnHover data-testid="coordinator-deliveries-table">
          <Table.Thead>
            <Table.Tr>
              {DELIVERY_SORT_COLUMNS.map((column) => (
                <Table.Th key={column} aria-sort={ariaSort(sort, column)}>
                  <UnstyledButton
                    type="button"
                    onClick={() => {
                      setSort((current) => cycleSortState(current, column));
                    }}
                    aria-label={sortButtonLabel(column, sort, t)}
                    data-testid={`sort-${column}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      width: '100%',
                    }}
                  >
                    <AppText span fw={700} size="sm">
                      {columnHeader(column, t)}
                    </AppText>
                    <SortIcon sort={sort} column={column} />
                  </UnstyledButton>
                </Table.Th>
              ))}
            </Table.Tr>
            <Table.Tr>
              <Table.Th>
                <TextInput
                  size="xs"
                  autoComplete="off"
                  aria-label={t('filter_elder')}
                  data-testid="filter-elder"
                  value={filters.elderName}
                  placeholder={t('filter_contains')}
                  onChange={(event) => {
                    updateFilter('elderName', event.currentTarget.value);
                  }}
                />
              </Table.Th>
              <Table.Th>
                <TextInput
                  size="xs"
                  autoComplete="off"
                  aria-label={t('filter_address')}
                  data-testid="filter-address"
                  value={filters.address}
                  placeholder={t('filter_contains')}
                  onChange={(event) => {
                    updateFilter('address', event.currentTarget.value);
                  }}
                />
              </Table.Th>
              <Table.Th>
                <NativeSelect
                  size="xs"
                  aria-label={t('filter_volunteer')}
                  data-testid="filter-volunteer"
                  value={filters.volunteerId}
                  data={[
                    { value: '', label: t('filter_all') },
                    {
                      value: UNASSIGNED_FILTER,
                      label: t('needs_volunteer'),
                    },
                    ...volunteerOptions,
                  ]}
                  onChange={(event) => {
                    updateFilter('volunteerId', event.currentTarget.value);
                  }}
                />
              </Table.Th>
              <Table.Th>
                <NativeSelect
                  size="xs"
                  aria-label={t('filter_status')}
                  data-testid="filter-status"
                  value={filters.status}
                  data={[
                    { value: '', label: t('filter_all') },
                    ...statusOptions,
                  ]}
                  onChange={(event) => {
                    updateFilter('status', event.currentTarget.value);
                  }}
                />
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {visibleDeliveries.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <AppText data-testid="deliveries-filter-empty">
                    {t('filter_empty')}
                  </AppText>
                </Table.Td>
              </Table.Tr>
            ) : (
              visibleDeliveries.map((delivery) => {
                const unassigned = isUnassignedDelivery(delivery);
                return (
                  <Table.Tr
                    key={delivery.id}
                    data-testid={
                      unassigned
                        ? 'delivery-row-unassigned'
                        : 'delivery-row-assigned'
                    }
                    data-delivery-id={delivery.id}
                  >
                    <Table.Td>
                      <Stack gap={4}>
                        <AppText data-testid="delivery-elder-name">
                          {delivery.elder.fullName.length > 0
                            ? delivery.elder.fullName
                            : t('unnamed_elder')}
                        </AppText>
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <ElderAddress
                        elder={delivery.elder}
                        labels={addressLabels}
                      />
                    </Table.Td>
                    <Table.Td>
                      <NativeSelect
                        aria-label={t('assign_volunteer')}
                        data-testid={`assign-delivery-${delivery.id}`}
                        value={
                          unassigned
                            ? ASSIGN_UNASSIGNED_VALUE
                            : (delivery.volunteerId ?? ASSIGN_UNASSIGNED_VALUE)
                        }
                        data={assignOptions(delivery, assignableVolunteers, t)}
                        disabled={assignPending}
                        onChange={(event) => {
                          const next = event.currentTarget.value;
                          onAssign(
                            delivery.id,
                            next === ASSIGN_UNASSIGNED_VALUE ? null : next
                          );
                        }}
                      />
                    </Table.Td>
                    <Table.Td>
                      {unassigned ? (
                        <AppBadge
                          color="yellow"
                          size="sm"
                          data-testid="needs-volunteer-badge"
                        >
                          {t('needs_volunteer')}
                        </AppBadge>
                      ) : (
                        <Stack gap={4}>
                          <AppText data-testid="delivery-status">
                            {t(DELIVERY_STATUS_I18N_KEYS[delivery.status])}
                          </AppText>
                          {delivery.status === 'not_delivered' &&
                          delivery.note !== null &&
                          delivery.note !== undefined &&
                          delivery.note.length > 0 ? (
                            <AppText size="sm" data-testid="not-delivered-note">
                              {t('not_delivered_note')}: {delivery.note}
                            </AppText>
                          ) : null}
                        </Stack>
                      )}
                    </Table.Td>
                  </Table.Tr>
                );
              })
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Stack>
  );
}

function columnHeader(
  column: DeliverySortColumn,
  t: TFunction<'admin'>
): string {
  switch (column) {
    case 'elder':
      return t('elder_column');
    case 'address':
      return t('address_column');
    case 'volunteer':
      return t('volunteer_assign_column');
    case 'status':
      return t('status_column');
  }
}

function ariaSort(
  sort: DeliverySortState,
  column: DeliverySortColumn
): 'ascending' | 'descending' | 'none' {
  if (sort.column !== column) {
    return 'none';
  }
  return sort.direction === 'asc' ? 'ascending' : 'descending';
}

function sortButtonLabel(
  column: DeliverySortColumn,
  sort: DeliverySortState,
  t: TFunction<'admin'>
): string {
  const columnName = columnHeader(column, t);
  if (sort.column !== column) {
    return t('sort_column', { column: columnName });
  }
  return sort.direction === 'asc'
    ? t('sort_asc', { column: columnName })
    : t('sort_desc', { column: columnName });
}

function SortIcon({
  sort,
  column,
}: {
  sort: DeliverySortState;
  column: DeliverySortColumn;
}): JSX.Element {
  if (sort.column !== column) {
    return <IconSelector size={14} aria-hidden />;
  }
  if (sort.direction === 'asc') {
    return <IconChevronUp size={14} aria-hidden />;
  }
  return <IconChevronDown size={14} aria-hidden />;
}

function personName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  fallback: string
): string {
  const name = [firstName, lastName]
    .filter(
      (part): part is string => typeof part === 'string' && part.length > 0
    )
    .join(' ');
  return name.length > 0 ? name : fallback;
}

function assignOptions(
  delivery: DeliveryResponseDto,
  volunteers: DeliveryVolunteerDto[],
  t: TFunction<'admin'>
): Array<{ value: string; label: string }> {
  const options = [
    { value: ASSIGN_UNASSIGNED_VALUE, label: t('unassigned') },
    ...volunteers.map((volunteer) => ({
      value: volunteer.id,
      label: personName(
        volunteer.firstName,
        volunteer.lastName,
        t('unnamed_volunteer')
      ),
    })),
  ];
  if (
    delivery.volunteerId !== null &&
    delivery.volunteerId !== undefined &&
    !options.some((option) => option.value === delivery.volunteerId)
  ) {
    options.push({
      value: delivery.volunteerId,
      label: personName(
        delivery.volunteer?.firstName,
        delivery.volunteer?.lastName,
        t('unnamed_volunteer')
      ),
    });
  }
  return options;
}

function volunteerFilterOptions(
  deliveries: readonly DeliveryResponseDto[],
  assignableVolunteers: readonly DeliveryVolunteerDto[],
  labels: Pick<DeliveryListLabels, 'unnamedVolunteer' | 'unassignedVolunteer'>
): Array<{ value: string; label: string }> {
  const byId = new Map<string, string>();
  for (const volunteer of assignableVolunteers) {
    byId.set(
      volunteer.id,
      personName(
        volunteer.firstName,
        volunteer.lastName,
        labels.unnamedVolunteer
      )
    );
  }
  for (const delivery of deliveries) {
    if (
      delivery.volunteerId !== null &&
      delivery.volunteerId !== undefined &&
      !byId.has(delivery.volunteerId)
    ) {
      byId.set(delivery.volunteerId, deliveryVolunteerName(delivery, labels));
    }
  }
  return [...byId.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((left, right) => left.label.localeCompare(right.label));
}
