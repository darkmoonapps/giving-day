import { Anchor, Card, SimpleGrid, Stack, Table } from '@mantine/core';
import { getActiveCoordinatorCities } from '@giving-day/shared';
import {
  AppAlert,
  AppButton,
  AppText,
  AppTitle,
  LoadingState,
  SEMANTIC_COLORS,
} from '@giving-day/ui';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  useGetDistributionDayDashboard,
  useListDayParticipations,
  type DayParticipationCoordinatorRowDto,
} from '../api/generated/api';
import {
  formatDayHours,
  formatDistributionDate,
  isUuid,
} from '../distribution-days/format-day';
import { useLanguage } from '../i18n/use-language';
import { AppChrome } from '../layout/app-chrome';
import { useSession } from '../auth/session-provider';

function personName(
  firstName: string | null,
  lastName: string | null,
  fallback: string
): string {
  const name = [firstName, lastName]
    .filter(
      (part): part is string => typeof part === 'string' && part.length > 0
    )
    .join(' ');
  return name.length > 0 ? name : fallback;
}

function byStatus(
  responses: DayParticipationCoordinatorRowDto[],
  status: DayParticipationCoordinatorRowDto['responseStatus']
): DayParticipationCoordinatorRowDto[] {
  return responses.filter((row) => row.responseStatus === status);
}

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
      <AppTitle order={2} mt={4}>
        {value}
      </AppTitle>
    </Card>
  );
}

export function CoordinatorDayDashboardPage(): JSX.Element {
  const { cityId, dayId } = useParams();
  const navigate = useNavigate();
  const { user } = useSession();
  const { language } = useLanguage();
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation('common');
  const validIds = isUuid(cityId) && isUuid(dayId);
  const coordinatorCities =
    user === null ? [] : getActiveCoordinatorCities(user);
  const allowed =
    validIds && cityId !== undefined && coordinatorCities.includes(cityId);

  const dashboardQuery = useGetDistributionDayDashboard(
    cityId ?? '',
    dayId ?? '',
    { query: { enabled: allowed } }
  );
  const responsesQuery = useListDayParticipations(cityId ?? '', dayId ?? '', {
    query: { enabled: allowed },
  });

  const dashboard = dashboardQuery.data;
  const responses = responsesQuery.data?.responses ?? [];
  const loading =
    dashboardQuery.isLoading ||
    responsesQuery.isLoading ||
    dashboard === undefined;
  const failed =
    !allowed || dashboardQuery.isError || responsesQuery.isError || !validIds;

  const confirmed = byStatus(responses, 'confirmed');
  const pending = byStatus(responses, 'no_response');
  const declined = byStatus(responses, 'declined');

  const deliveriesPath = `/cities/${cityId}/days/${dayId}/deliveries`;
  const needsVolunteerPath = `${deliveriesPath}?needsVolunteer=1`;
  const responsesPath = `/cities/${cityId}/days/${dayId}/responses`;

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
        data-testid="coordinator-dashboard-page"
      >
        {!allowed ? (
          <AppAlert
            color="red"
            title={t('dashboard_no_access_title')}
            data-testid="dashboard-no-access"
          >
            {t('dashboard_no_access')}
          </AppAlert>
        ) : failed ? (
          <AppAlert color="red" title={tCommon('error.unexpected_title')}>
            {t('dashboard_load_error')}
          </AppAlert>
        ) : loading || dashboard === undefined ? (
          <LoadingState label={tCommon('loading')} />
        ) : (
          <>
            <div>
              <AppTitle order={1}>{t('dashboard_title')}</AppTitle>
              <AppText mt="xs">
                {formatDistributionDate(dashboard.date, language)}
              </AppText>
              <AppText c="dimmed">
                {formatDayHours(dashboard.startTime, dashboard.endTime)}
              </AppText>
              <AppText c="dimmed" mt="sm">
                {t('dashboard_subtitle')}
              </AppText>
            </div>

            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
              <StatCard
                testId="dashboard-stat-volunteers"
                label={t('overview_volunteers')}
                value={dashboard.volunteers.total}
              />
              <StatCard
                testId="dashboard-stat-confirmed"
                label={t('status_confirmed')}
                value={dashboard.volunteers.confirmed}
                color="wisteria"
              />
              <StatCard
                testId="dashboard-stat-pending"
                label={t('status_no_response')}
                value={dashboard.volunteers.pending}
                color="yellow"
              />
              <StatCard
                testId="dashboard-stat-declined"
                label={t('status_declined')}
                value={dashboard.volunteers.declined}
                color="red"
              />
              <StatCard
                testId="dashboard-stat-unassigned"
                label={t('needs_volunteer')}
                value={dashboard.unassignedElders.length}
                color="yellow"
              />
              <StatCard
                testId="dashboard-stat-picked"
                label={t('delivery_status_picked')}
                value={dashboard.deliveries.picked}
                color="wisteria"
              />
              <StatCard
                testId="dashboard-stat-delivered"
                label={t('delivery_status_delivered')}
                value={dashboard.deliveries.delivered}
                color={SEMANTIC_COLORS.delivered}
              />
              <StatCard
                testId="dashboard-stat-not-delivered"
                label={t('delivery_status_not_delivered')}
                value={dashboard.deliveries.notDelivered}
                color="red"
              />
            </SimpleGrid>

            <Stack gap="xs">
              <AppButton
                data-testid="dashboard-needs-volunteer-link"
                onClick={() => {
                  void navigate(needsVolunteerPath);
                }}
              >
                {t('view_needs_volunteer')}
              </AppButton>
              <AppButton
                variant="light"
                data-testid="dashboard-view-responses"
                onClick={() => {
                  void navigate(responsesPath);
                }}
              >
                {t('view_responses')}
              </AppButton>
              <AppButton
                variant="light"
                data-testid="dashboard-view-deliveries"
                onClick={() => {
                  void navigate(deliveriesPath);
                }}
              >
                {t('view_deliveries')}
              </AppButton>
            </Stack>

            <Stack gap="sm" data-testid="dashboard-unassigned-elders">
              <AppTitle order={2}>{t('unassigned_section')}</AppTitle>
              {dashboard.unassignedElders.length === 0 ? (
                <AppText c="dimmed">{t('unassigned_empty')}</AppText>
              ) : (
                <Table highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('elder_column')}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {dashboard.unassignedElders.map((elder) => (
                      <Table.Tr key={elder.elderId}>
                        <Table.Td>
                          <Anchor
                            component={Link}
                            to={`/cities/${cityId}/elders?elderId=${elder.elderId}`}
                            data-testid={`elder-link-${elder.elderId}`}
                          >
                            {elder.fullName.length > 0
                              ? elder.fullName
                              : t('unnamed_elder')}
                          </Anchor>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </Stack>

            <ResponseList
              testId="dashboard-confirmed-list"
              title={t('confirmed_section')}
              empty={t('confirmed_empty')}
              rows={confirmed}
              cityId={cityId ?? ''}
              dayId={dayId ?? ''}
              unnamed={t('unnamed_volunteer')}
              showReason={false}
              noReason={t('no_reason')}
              reasonLabel={t('reason_column')}
              volunteerLabel={t('volunteer_column')}
            />
            <ResponseList
              testId="dashboard-pending-list"
              title={t('pending_section')}
              empty={t('pending_empty')}
              rows={pending}
              cityId={cityId ?? ''}
              dayId={dayId ?? ''}
              unnamed={t('unnamed_volunteer')}
              showReason={false}
              noReason={t('no_reason')}
              reasonLabel={t('reason_column')}
              volunteerLabel={t('volunteer_column')}
            />
            <ResponseList
              testId="dashboard-declined-list"
              title={t('declined_section')}
              empty={t('declined_empty')}
              rows={declined}
              cityId={cityId ?? ''}
              dayId={dayId ?? ''}
              unnamed={t('unnamed_volunteer')}
              showReason
              noReason={t('no_reason')}
              reasonLabel={t('reason_column')}
              volunteerLabel={t('volunteer_column')}
            />
          </>
        )}
      </Stack>
    </AppChrome>
  );
}

function ResponseList({
  testId,
  title,
  empty,
  rows,
  cityId,
  dayId,
  unnamed,
  showReason,
  noReason,
  reasonLabel,
  volunteerLabel,
}: {
  testId: string;
  title: string;
  empty: string;
  rows: DayParticipationCoordinatorRowDto[];
  cityId: string;
  dayId: string;
  unnamed: string;
  showReason: boolean;
  noReason: string;
  reasonLabel: string;
  volunteerLabel: string;
}): JSX.Element {
  return (
    <Stack gap="sm" data-testid={testId}>
      <AppTitle order={2}>{title}</AppTitle>
      {rows.length === 0 ? (
        <AppText c="dimmed">{empty}</AppText>
      ) : (
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{volunteerLabel}</Table.Th>
              {showReason ? <Table.Th>{reasonLabel}</Table.Th> : null}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((row) => (
              <Table.Tr key={row.volunteerId}>
                <Table.Td>
                  <Anchor
                    component={Link}
                    to={`/cities/${cityId}/days/${dayId}/responses`}
                    data-testid={`volunteer-link-${row.volunteerId}`}
                  >
                    {personName(row.firstName, row.lastName, unnamed)}
                  </Anchor>
                </Table.Td>
                {showReason ? (
                  <Table.Td data-testid="dashboard-cancel-reason">
                    {row.cancelReason !== null && row.cancelReason.length > 0
                      ? row.cancelReason
                      : noReason}
                  </Table.Td>
                ) : null}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  );
}
