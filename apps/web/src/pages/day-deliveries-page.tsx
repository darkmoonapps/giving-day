import { Stack } from '@mantine/core';
import { getActiveCoordinatorCities } from '@giving-day/shared';
import {
  AppAlert,
  AppButton,
  AppText,
  AppTitle,
  LoadingState,
} from '@giving-day/ui';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useAssignDayDelivery,
  useGetDistributionDay,
  useListDayDeliveries,
  type DayDeliveriesResponseDto,
  type DeliveryVolunteerDto,
} from '../api/generated/api';
import { CoordinatorDeliveriesTable } from '../deliveries/coordinator-deliveries-table';
import { VolunteerAssignedDeliveries } from '../deliveries/volunteer-assigned-deliveries';
import {
  formatDayHours,
  formatDistributionDate,
  isUuid,
} from '../distribution-days/format-day';
import { useLanguage } from '../i18n/use-language';
import { AppChrome } from '../layout/app-chrome';
import { useSession } from '../auth/session-provider';

function isCoordinatorDeliveries(
  value: DayDeliveriesResponseDto
): value is DayDeliveriesResponseDto & {
  assignableVolunteers: DeliveryVolunteerDto[];
  unassignedCount: number;
} {
  return (
    Array.isArray(value.assignableVolunteers) &&
    typeof value.unassignedCount === 'number'
  );
}

function CoordinatorDeliveries({
  cityId,
  dayId,
}: {
  cityId: string;
  dayId: string;
}): JSX.Element {
  const { language } = useLanguage();
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation('common');
  const dayQuery = useGetDistributionDay(cityId, dayId);
  const deliveriesQuery = useListDayDeliveries(cityId, dayId);
  const assignMutation = useAssignDayDelivery({
    mutation: {
      onSuccess: async () => {
        await deliveriesQuery.refetch();
      },
    },
  });

  const day = dayQuery.data;
  const payload = deliveriesQuery.data;
  const coordinatorPayload =
    payload !== undefined && isCoordinatorDeliveries(payload) ? payload : null;
  const loading =
    dayQuery.isLoading ||
    deliveriesQuery.isLoading ||
    day === undefined ||
    coordinatorPayload === null;
  const failed = dayQuery.isError || deliveriesQuery.isError;

  return (
    <Stack
      gap="lg"
      component="section"
      data-testid="coordinator-deliveries-page"
    >
      {failed ? (
        <AppAlert color="red" title={tCommon('error.unexpected_title')}>
          {t('deliveries_load_error')}
        </AppAlert>
      ) : loading || day === undefined || coordinatorPayload === null ? (
        <LoadingState label={tCommon('loading')} />
      ) : (
        <>
          <div>
            <AppTitle order={1}>{t('deliveries_title')}</AppTitle>
            <AppText mt="xs">
              {formatDistributionDate(day.date, language)}
            </AppText>
            <AppText c="dimmed">
              {formatDayHours(day.startTime, day.endTime)}
            </AppText>
            <AppText c="dimmed" mt="sm">
              {t('deliveries_subtitle')}
            </AppText>
          </div>

          {assignMutation.isError ? (
            <AppAlert color="red" data-testid="assign-error">
              {t('assign_error')}
            </AppAlert>
          ) : null}

          {coordinatorPayload.deliveries.length === 0 ? (
            <AppText>{t('deliveries_empty')}</AppText>
          ) : (
            <CoordinatorDeliveriesTable
              deliveries={coordinatorPayload.deliveries}
              assignableVolunteers={coordinatorPayload.assignableVolunteers}
              unassignedCount={coordinatorPayload.unassignedCount}
              assignPending={assignMutation.isPending}
              onAssign={(deliveryId, volunteerId) => {
                assignMutation.mutate({
                  cityId,
                  dayId,
                  deliveryId,
                  data: { volunteerId },
                });
              }}
            />
          )}
        </>
      )}
    </Stack>
  );
}

function VolunteerDeliveries({
  cityId,
  dayId,
}: {
  cityId: string;
  dayId: string;
}): JSX.Element {
  const { language } = useLanguage();
  const { t } = useTranslation('volunteer');
  const { t: tCommon } = useTranslation('common');
  const dayQuery = useGetDistributionDay(cityId, dayId);
  const day = dayQuery.data;
  const confirmed = day?.myParticipation?.status === 'confirmed';
  const loading = dayQuery.isLoading || day === undefined;
  const failed = dayQuery.isError;

  return (
    <Stack gap="lg" component="section" data-testid="volunteer-deliveries-page">
      {failed ? (
        <AppAlert color="red" title={tCommon('error.unexpected_title')}>
          {t('deliveries_load_error')}
        </AppAlert>
      ) : loading || day === undefined ? (
        <LoadingState label={tCommon('loading')} />
      ) : (
        <>
          <div>
            <AppTitle order={1}>{t('deliveries_title')}</AppTitle>
            <AppText mt="xs">
              {formatDistributionDate(day.date, language)}
            </AppText>
            <AppText c="dimmed">
              {formatDayHours(day.startTime, day.endTime)}
            </AppText>
            <AppText c="dimmed" mt="sm">
              {t('deliveries_subtitle')}
            </AppText>
          </div>

          {!confirmed ? (
            <AppAlert data-testid="confirm-first">
              {t('deliveries_confirm_first')}
            </AppAlert>
          ) : (
            <VolunteerAssignedDeliveries cityId={cityId} dayId={dayId} />
          )}
        </>
      )}
    </Stack>
  );
}

export function DayDeliveriesPage(): JSX.Element {
  const { cityId, dayId } = useParams();
  const navigate = useNavigate();
  const { t: tCommon } = useTranslation('common');
  const { user } = useSession();
  const validIds = isUuid(cityId) && isUuid(dayId);
  const isCoordinator =
    user !== null &&
    cityId !== undefined &&
    getActiveCoordinatorCities(user).includes(cityId);

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
      {!validIds || cityId === undefined || dayId === undefined ? (
        <AppAlert color="red" title={tCommon('error.unexpected_title')}>
          {tCommon('error.unexpected_body')}
        </AppAlert>
      ) : isCoordinator ? (
        <CoordinatorDeliveries cityId={cityId} dayId={dayId} />
      ) : (
        <VolunteerDeliveries cityId={cityId} dayId={dayId} />
      )}
    </AppChrome>
  );
}
