import { AppButton, AppText } from '@giving-day/ui';
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
import { useLanguage } from '../i18n/use-language';
import {
  auditActionLabel,
  auditEntityLabel,
  formatAuditAt,
} from './audit-log-labels';
import {
  AUDIT_LOG_SORT_COLUMNS,
  EMPTY_AUDIT_LOG_FILTERS,
  actionFilterValues,
  cycleSortState,
  entityFilterValues,
  filterAndSortAuditLogs,
  hasActiveAuditLogFilters,
  type AuditLogListFilters,
  type AuditLogListItem,
  type AuditLogListLabels,
  type AuditLogSortColumn,
  type AuditLogSortState,
} from './audit-log-list-query';

export function CoordinatorAuditLogTable({
  entries,
}: {
  entries: readonly AuditLogListItem[];
}): JSX.Element {
  const { language } = useLanguage();
  const { t } = useTranslation('admin');
  const [sort, setSort] = useState<AuditLogSortState>({
    column: null,
    direction: 'asc',
  });
  const [filters, setFilters] = useState<AuditLogListFilters>(
    EMPTY_AUDIT_LOG_FILTERS
  );
  const labels = useMemo<AuditLogListLabels>(
    () => ({
      locale: language,
      actionLabel: (action) => auditActionLabel(action, t),
      entityLabel: (entity) => auditEntityLabel(entity, t),
      formatAt: (iso) => formatAuditAt(iso, language),
    }),
    [language, t]
  );
  const visibleEntries = useMemo(
    () => filterAndSortAuditLogs(entries, sort, filters, labels),
    [entries, filters, labels, sort]
  );
  const actionOptions = actionFilterValues(entries).map((action) => ({
    value: action,
    label: labels.actionLabel(action),
  }));
  const entityOptions = entityFilterValues(entries).map((entity) => ({
    value: entity,
    label: labels.entityLabel(entity),
  }));
  const filtersActive = hasActiveAuditLogFilters(filters);

  const updateFilter = (
    key: keyof AuditLogListFilters,
    value: string
  ): void => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="center" wrap="wrap">
        <AppText c="dimmed" size="sm" data-testid="audit-log-filter-count">
          {t('filter_showing', {
            shown: visibleEntries.length,
            total: entries.length,
          })}
        </AppText>
        {filtersActive ? (
          <AppButton
            size="xs"
            variant="light"
            data-testid="clear-audit-log-filters"
            onClick={() => {
              setFilters(EMPTY_AUDIT_LOG_FILTERS);
            }}
          >
            {t('filter_clear')}
          </AppButton>
        ) : null}
      </Group>

      <Table.ScrollContainer minWidth={860}>
        <Table striped highlightOnHover data-testid="audit-log-table">
          <Table.Thead>
            <Table.Tr>
              {AUDIT_LOG_SORT_COLUMNS.map((column) => (
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
                  aria-label={t('filter_audit_at')}
                  data-testid="filter-audit-at"
                  value={filters.at}
                  placeholder={t('filter_contains')}
                  onChange={(event) => {
                    updateFilter('at', event.currentTarget.value);
                  }}
                />
              </Table.Th>
              <Table.Th>
                <NativeSelect
                  size="xs"
                  aria-label={t('filter_audit_action')}
                  data-testid="filter-audit-action"
                  value={filters.action}
                  data={[
                    { value: '', label: t('filter_all') },
                    ...actionOptions,
                  ]}
                  onChange={(event) => {
                    updateFilter('action', event.currentTarget.value);
                  }}
                />
              </Table.Th>
              <Table.Th>
                <NativeSelect
                  size="xs"
                  aria-label={t('filter_audit_entity')}
                  data-testid="filter-audit-entity"
                  value={filters.entity}
                  data={[
                    { value: '', label: t('filter_all') },
                    ...entityOptions,
                  ]}
                  onChange={(event) => {
                    updateFilter('entity', event.currentTarget.value);
                  }}
                />
              </Table.Th>
              <Table.Th>
                <TextInput
                  size="xs"
                  autoComplete="off"
                  aria-label={t('filter_audit_entity_id')}
                  data-testid="filter-audit-entity-id"
                  value={filters.entityId}
                  placeholder={t('filter_contains')}
                  onChange={(event) => {
                    updateFilter('entityId', event.currentTarget.value);
                  }}
                />
              </Table.Th>
              <Table.Th>
                <TextInput
                  size="xs"
                  autoComplete="off"
                  aria-label={t('filter_audit_actor_id')}
                  data-testid="filter-audit-actor-id"
                  value={filters.actorId}
                  placeholder={t('filter_contains')}
                  onChange={(event) => {
                    updateFilter('actorId', event.currentTarget.value);
                  }}
                />
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {visibleEntries.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={AUDIT_LOG_SORT_COLUMNS.length}>
                  <AppText data-testid="audit-log-filter-empty">
                    {t('audit_log_filter_empty')}
                  </AppText>
                </Table.Td>
              </Table.Tr>
            ) : (
              visibleEntries.map((entry) => (
                <Table.Tr
                  key={entry.id}
                  data-testid={`audit-log-row-${entry.id}`}
                >
                  <Table.Td data-testid={`audit-log-at-${entry.id}`}>
                    {labels.formatAt(entry.at)}
                  </Table.Td>
                  <Table.Td data-testid={`audit-log-action-${entry.id}`}>
                    {labels.actionLabel(entry.action)}
                  </Table.Td>
                  <Table.Td data-testid={`audit-log-entity-${entry.id}`}>
                    {labels.entityLabel(entry.entity)}
                  </Table.Td>
                  <Table.Td data-testid={`audit-log-entity-id-${entry.id}`}>
                    <AppText size="sm" ff="monospace">
                      {entry.entityId}
                    </AppText>
                  </Table.Td>
                  <Table.Td data-testid={`audit-log-actor-id-${entry.id}`}>
                    <AppText size="sm" ff="monospace">
                      {entry.actorId}
                    </AppText>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Stack>
  );
}

function columnHeader(
  column: AuditLogSortColumn,
  t: TFunction<'admin'>
): string {
  switch (column) {
    case 'at':
      return t('audit_log_column_at');
    case 'action':
      return t('audit_log_column_action');
    case 'entity':
      return t('audit_log_column_entity');
    case 'entityId':
      return t('audit_log_column_entity_id');
    case 'actorId':
      return t('audit_log_column_actor_id');
  }
}

function ariaSort(
  sort: AuditLogSortState,
  column: AuditLogSortColumn
): 'ascending' | 'descending' | 'none' {
  if (sort.column !== column) {
    return 'none';
  }
  return sort.direction === 'asc' ? 'ascending' : 'descending';
}

function sortButtonLabel(
  column: AuditLogSortColumn,
  sort: AuditLogSortState,
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
  sort: AuditLogSortState;
  column: AuditLogSortColumn;
}): JSX.Element {
  if (sort.column !== column) {
    return <IconSelector size={14} aria-hidden />;
  }
  if (sort.direction === 'asc') {
    return <IconChevronUp size={14} aria-hidden />;
  }
  return <IconChevronDown size={14} aria-hidden />;
}
