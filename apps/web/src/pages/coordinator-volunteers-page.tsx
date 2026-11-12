import { Group, NativeSelect, Stack, Table, TextInput } from '@mantine/core';
import { getActiveCoordinatorCities } from '@giving-day/shared';
import {
  AppAlert,
  AppButton,
  AppText,
  AppTitle,
  LoadingState,
} from '@giving-day/ui';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useListCityVolunteers,
  useListDistributionDays,
} from '../api/generated/api';
import { useSession } from '../auth/session-provider';
import {
  formatDistributionDate,
  isUuid,
} from '../distribution-days/format-day';
import { useLanguage } from '../i18n/use-language';
import { AppChrome } from '../layout/app-chrome';
import {
  EMPTY_VOLUNTEER_LIST_FILTERS,
  hasActiveVolunteerFilters,
  volunteerDisplayName,
  volunteerListParams,
  type VolunteerDayResponseFilter,
  type VolunteerListFilters,
  type VolunteerMembershipFilter,
} from '../volunteers/volunteer-list-query';

const MEMBERSHIP_STATUS_KEYS = {
  pending: 'membership_status_pending',
  active: 'membership_status_active',
  paused: 'membership_status_paused',
  removed: 'membership_status_removed',
} as const;

const DAY_RESPONSE_KEYS = {
  confirmed: 'status_confirmed',
  declined: 'status_declined',
  no_response: 'status_no_response',
} as const;

export function CoordinatorVolunteersPage(): JSX.Element {
  const { cityId } = useParams();
  const navigate = useNavigate();
  const { user } = useSession();
  const { language } = useLanguage();
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation('common');
  const validId = isUuid(cityId);
  const coordinatorCities =
    user === null ? [] : getActiveCoordinatorCities(user);
  const allowed = validId && coordinatorCities.includes(cityId ?? '');
  const [filters, setFilters] = useState<VolunteerListFilters>(
    EMPTY_VOLUNTEER_LIST_FILTERS
  );

  const listParams = useMemo(() => volunteerListParams(filters), [filters]);
  const daysQuery = useListDistributionDays(cityId ?? '', {
    query: { enabled: allowed },
  });
  const volunteersQuery = useListCityVolunteers(cityId ?? '', listParams, {
    query: {
      enabled: allowed,
      placeholderData: (previousData) => previousData,
    },
  });

  const volunteers = volunteersQuery.data?.volunteers ?? [];
  const days = daysQuery.data?.days ?? [];
  const loading =
    volunteersQuery.isPending && volunteersQuery.data === undefined;
  const failed = !allowed || volunteersQuery.isError;
  const filtersActive = hasActiveVolunteerFilters(filters);
  const showDayResponse = filters.dayId.length > 0;

  const updateFilter = <K extends keyof VolunteerListFilters>(
    key: K,
    value: VolunteerListFilters[K]
  ): void => {
    setFilters((current) => {
      const next = { ...current, [key]: value };
      if (key === 'dayId' && value === '') {
        next.dayResponse = 'all';
      }
      return next;
    });
  };

  return (
    <AppChrome
      actions={
        <AppButton
          size="xs"
          variant="light"
          onClick={() => {
            void navigate('/');
          }}
        >
          {tCommon('back')}
        </AppButton>
      }
    >
      <Stack
        gap="lg"
        component="section"
        data-testid="coordinator-volunteers-page"
      >
        {failed ? (
          <AppAlert color="red" title={tCommon('error.unexpected_title')}>
            {t('volunteers_load_error')}
          </AppAlert>
        ) : loading ? (
          <LoadingState label={tCommon('loading')} />
        ) : (
          <>
            <div>
              <AppTitle order={1}>{t('volunteers_title')}</AppTitle>
              <AppText c="dimmed" mt="sm">
                {t('volunteers_subtitle')}
              </AppText>
            </div>

            <Stack gap="sm" data-testid="volunteer-list-filters">
              <TextInput
                label={t('filter_volunteer_search')}
                aria-label={t('filter_volunteer_search')}
                placeholder={t('filter_contains')}
                value={filters.search}
                autoComplete="off"
                data-testid="volunteer-search"
                onChange={(event) => {
                  updateFilter('search', event.currentTarget.value);
                }}
              />
              <Group grow preventGrowOverflow={false} align="flex-end">
                <NativeSelect
                  label={t('filter_membership_status')}
                  aria-label={t('filter_membership_status')}
                  value={filters.status}
                  data-testid="volunteer-status-filter"
                  data={[
                    { value: 'all', label: t('filter_all') },
                    {
                      value: 'pending',
                      label: t('membership_status_pending'),
                    },
                    { value: 'active', label: t('membership_status_active') },
                    { value: 'paused', label: t('membership_status_paused') },
                  ]}
                  onChange={(event) => {
                    updateFilter(
                      'status',
                      event.currentTarget.value as VolunteerMembershipFilter
                    );
                  }}
                />
                <NativeSelect
                  label={t('filter_distribution_day')}
                  aria-label={t('filter_distribution_day')}
                  value={filters.dayId}
                  data-testid="volunteer-day-filter"
                  data={[
                    { value: '', label: t('filter_any_day') },
                    ...days.map((day) => ({
                      value: day.id,
                      label: formatDistributionDate(day.date, language),
                    })),
                  ]}
                  onChange={(event) => {
                    updateFilter('dayId', event.currentTarget.value);
                  }}
                />
                <NativeSelect
                  label={t('filter_day_response')}
                  aria-label={t('filter_day_response')}
                  value={filters.dayResponse}
                  data-testid="volunteer-day-response-filter"
                  disabled={!showDayResponse}
                  data={[
                    { value: 'all', label: t('filter_all') },
                    {
                      value: 'confirmed',
                      label: t('status_confirmed'),
                    },
                    {
                      value: 'declined',
                      label: t('status_declined'),
                    },
                    {
                      value: 'no_response',
                      label: t('status_no_response'),
                    },
                  ]}
                  onChange={(event) => {
                    updateFilter(
                      'dayResponse',
                      event.currentTarget.value as VolunteerDayResponseFilter
                    );
                  }}
                />
              </Group>
              {filtersActive ? (
                <AppButton
                  size="xs"
                  variant="light"
                  data-testid="volunteer-filters-clear"
                  onClick={() => {
                    setFilters(EMPTY_VOLUNTEER_LIST_FILTERS);
                  }}
                >
                  {t('filter_clear')}
                </AppButton>
              ) : null}
            </Stack>

            {volunteers.length === 0 ? (
              <AppText data-testid="volunteers-empty">
                {filtersActive
                  ? t('volunteers_filter_empty')
                  : t('volunteers_empty')}
              </AppText>
            ) : (
              <Table
                highlightOnHover
                data-testid="coordinator-volunteers-table"
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t('volunteer_column')}</Table.Th>
                    <Table.Th>{t('phone_column')}</Table.Th>
                    <Table.Th>{t('home_area_column')}</Table.Th>
                    <Table.Th>{t('status_column')}</Table.Th>
                    {showDayResponse ? (
                      <Table.Th>{t('day_response_column')}</Table.Th>
                    ) : null}
                    {showDayResponse ? (
                      <Table.Th>{t('reason_column')}</Table.Th>
                    ) : null}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {volunteers.map((volunteer) => (
                    <Table.Tr
                      key={volunteer.membershipId}
                      data-testid={`volunteer-row-${volunteer.membershipId}`}
                    >
                      <Table.Td>
                        {volunteerDisplayName(
                          volunteer.firstName,
                          volunteer.lastName,
                          t('unnamed_volunteer')
                        )}
                      </Table.Td>
                      <Table.Td>{volunteer.phone ?? t('no_reason')}</Table.Td>
                      <Table.Td>
                        {volunteer.homeArea ?? t('no_reason')}
                      </Table.Td>
                      <Table.Td>
                        {t(MEMBERSHIP_STATUS_KEYS[volunteer.status])}
                      </Table.Td>
                      {showDayResponse ? (
                        <Table.Td>
                          {volunteer.dayResponseStatus === null
                            ? t('no_reason')
                            : t(DAY_RESPONSE_KEYS[volunteer.dayResponseStatus])}
                        </Table.Td>
                      ) : null}
                      {showDayResponse ? (
                        <Table.Td>
                          {volunteer.cancelReason ?? t('no_reason')}
                        </Table.Td>
                      ) : null}
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </>
        )}
      </Stack>
    </AppChrome>
  );
}
