import { Stack } from '@mantine/core';
import {
  getActiveCoordinatorCities,
  type ContactRelation,
} from '@giving-day/shared';
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
import { ElderAddress } from '../deliveries/elder-address';
import {
  formatDayHours,
  formatDistributionDate,
  isUuid,
} from '../distribution-days/format-day';
import { useLanguage } from '../i18n/use-language';
import { AppChrome } from '../layout/app-chrome';
import { useSession } from '../auth/session-provider';

const CONTACT_RELATION_KEYS: Record<
  ContactRelation,
  | 'contact_relation_child'
  | 'contact_relation_spouse'
  | 'contact_relation_sibling'
  | 'contact_relation_caregiver'
  | 'contact_relation_social_worker'
  | 'contact_relation_neighbor'
  | 'contact_relation_other'
> = {
  child: 'contact_relation_child',
  spouse: 'contact_relation_spouse',
  sibling: 'contact_relation_sibling',
  caregiver: 'contact_relation_caregiver',
  social_worker: 'contact_relation_social_worker',
  neighbor: 'contact_relation_neighbor',
  other: 'contact_relation_other',
};

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
  const deliveriesQuery = useListDayDeliveries(cityId, dayId);
  const day = dayQuery.data;
  const confirmed = day?.myParticipation?.status === 'confirmed';
  const loading =
    dayQuery.isLoading || deliveriesQuery.isLoading || day === undefined;
  const failed = dayQuery.isError || deliveriesQuery.isError;
  const labels = {
    entrance: t('entrance_label'),
    floor: t('floor_label'),
    apartment: t('apartment_label'),
  };

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
          ) : (deliveriesQuery.data?.deliveries.length ?? 0) === 0 ? (
            <AppText data-testid="volunteer-deliveries-empty">
              {t('deliveries_empty')}
            </AppText>
          ) : (
            <Stack gap="md" data-testid="volunteer-deliveries-list">
              {deliveriesQuery.data?.deliveries.map((delivery) => (
                <Stack
                  key={delivery.id}
                  gap="xs"
                  data-testid="volunteer-delivery-card"
                >
                  <AppText fw={600}>{delivery.elder.fullName}</AppText>
                  <ElderAddress elder={delivery.elder} labels={labels} />
                  {delivery.elder.contacts.length > 0 ? (
                    <Stack gap={4} data-testid="elder-next-of-kin">
                      <AppText size="sm" fw={500}>
                        {t('next_of_kin_label')}
                      </AppText>
                      {delivery.elder.contacts.map((contact) => (
                        <Stack gap={0} key={`${contact.phone}-${contact.name}`}>
                          <AppText size="sm">
                            {contact.name} (
                            {t(CONTACT_RELATION_KEYS[contact.relation])})
                          </AppText>
                          <AppText size="sm">
                            <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                          </AppText>
                        </Stack>
                      ))}
                    </Stack>
                  ) : null}
                  {delivery.elder.addressNotes !== null &&
                  delivery.elder.addressNotes.length > 0 ? (
                    <AppText size="sm">
                      {t('address_notes_label')}: {delivery.elder.addressNotes}
                    </AppText>
                  ) : null}
                  {delivery.elder.notes !== null &&
                  delivery.elder.notes.length > 0 ? (
                    <AppText size="sm">
                      {t('elder_notes_label')}: {delivery.elder.notes}
                    </AppText>
                  ) : null}
                </Stack>
              ))}
            </Stack>
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
