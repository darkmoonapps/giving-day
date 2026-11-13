import { Card, SimpleGrid, Stack, Table } from '@mantine/core';
import {
  getActiveCoordinatorCities,
  type LanguageCode,
} from '@giving-day/shared';
import {
  AppAlert,
  AppButton,
  AppText,
  AppTitle,
  LoadingState,
  SEMANTIC_COLORS,
} from '@giving-day/ui';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useGetCityPastDistributionDaysStats,
  type PastDistributionDayStatsDto,
} from '../api/generated/api';
import { useSession } from '../auth/session-provider';
import {
  formatDistributionDate,
  isUuid,
} from '../distribution-days/format-day';
import { useLanguage } from '../i18n/use-language';
import { AppChrome } from '../layout/app-chrome';

function StatCard({
  testId,
  label,
  value,
  color,
}: {
  testId: string;
  label: string;
  value: number;
  color?: string;
}): JSX.Element {
  return (
    <Card
      padding="md"
      radius="md"
      withBorder
      data-testid={testId}
      aria-label={`${label}: ${value}`}
      style={
        color === undefined
          ? undefined
          : {
              borderInlineStartWidth: 4,
              borderInlineStartColor: `var(--mantine-color-${color}-4)`,
            }
      }
    >
      <AppText size="sm" c="dimmed">
        {label}
      </AppText>
      <AppText size="xl" fw={700} mt={4} data-testid={`${testId}-value`}>
        {value}
      </AppText>
    </Card>
  );
}

function DayStatsRow({
  day,
  language,
}: {
  day: PastDistributionDayStatsDto;
  language: LanguageCode;
}): JSX.Element {
  return (
    <Table.Tr data-testid={`past-day-stats-row-${day.dayId}`}>
      <Table.Td data-testid={`past-day-date-${day.dayId}`}>
        {formatDistributionDate(day.date, language)}
      </Table.Td>
      <Table.Td>{day.eldersServed}</Table.Td>
      <Table.Td>{day.packagesDelivered}</Table.Td>
      <Table.Td>{day.packagesNotDelivered}</Table.Td>
      <Table.Td>{day.packagesOpen}</Table.Td>
      <Table.Td>{day.volunteersConfirmed}</Table.Td>
      <Table.Td>{day.volunteersDeclined}</Table.Td>
    </Table.Tr>
  );
}

export function CoordinatorPastDaysStatsPage(): JSX.Element {
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

  const statsQuery = useGetCityPastDistributionDaysStats(cityId ?? '', {
    query: { enabled: allowed },
  });

  const stats = statsQuery.data;
  const loading = statsQuery.isLoading || stats === undefined;
  const failed = !allowed || statsQuery.isError || !validId;

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
        data-testid="coordinator-past-days-stats-page"
      >
        {!allowed ? (
          <AppAlert
            color="red"
            title={t('past_days_stats_no_access_title')}
            data-testid="past-days-stats-no-access"
          >
            {t('past_days_stats_no_access')}
          </AppAlert>
        ) : failed ? (
          <AppAlert color="red" title={tCommon('error.unexpected_title')}>
            {t('past_days_stats_load_error')}
          </AppAlert>
        ) : loading || stats === undefined ? (
          <LoadingState label={tCommon('loading')} />
        ) : (
          <>
            <div>
              <AppTitle order={1}>{t('past_days_stats_title')}</AppTitle>
              <AppText c="dimmed" mt="sm">
                {t('past_days_stats_subtitle')}
              </AppText>
            </div>

            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
              <StatCard
                testId="past-days-stats-total-days"
                label={t('past_days_stats_total_days')}
                value={stats.totals.days}
              />
              <StatCard
                testId="past-days-stats-elders-served"
                label={t('past_days_stats_elders_served')}
                value={stats.totals.eldersServed}
                color={SEMANTIC_COLORS.delivered}
              />
              <StatCard
                testId="past-days-stats-delivered"
                label={t('delivery_status_delivered')}
                value={stats.totals.packagesDelivered}
                color={SEMANTIC_COLORS.delivered}
              />
              <StatCard
                testId="past-days-stats-not-delivered"
                label={t('delivery_status_not_delivered')}
                value={stats.totals.packagesNotDelivered}
                color="red"
              />
              <StatCard
                testId="past-days-stats-open"
                label={t('past_days_stats_packages_open')}
                value={stats.totals.packagesOpen}
                color="yellow"
              />
              <StatCard
                testId="past-days-stats-confirmed"
                label={t('status_confirmed')}
                value={stats.totals.volunteersConfirmed}
                color="wisteria"
              />
              <StatCard
                testId="past-days-stats-declined"
                label={t('status_declined')}
                value={stats.totals.volunteersDeclined}
                color="red"
              />
            </SimpleGrid>

            {stats.days.length === 0 ? (
              <AppText c="dimmed" data-testid="past-days-stats-empty">
                {t('past_days_stats_empty')}
              </AppText>
            ) : (
              <Table.ScrollContainer minWidth={720}>
                <Table
                  striped
                  highlightOnHover
                  data-testid="past-days-stats-table"
                >
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('past_days_stats_day_column')}</Table.Th>
                      <Table.Th>{t('past_days_stats_elders_served')}</Table.Th>
                      <Table.Th>{t('delivery_status_delivered')}</Table.Th>
                      <Table.Th>{t('delivery_status_not_delivered')}</Table.Th>
                      <Table.Th>{t('past_days_stats_packages_open')}</Table.Th>
                      <Table.Th>{t('status_confirmed')}</Table.Th>
                      <Table.Th>{t('status_declined')}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {stats.days.map((day) => (
                      <DayStatsRow
                        key={day.dayId}
                        day={day}
                        language={language}
                      />
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            )}
          </>
        )}
      </Stack>
    </AppChrome>
  );
}
