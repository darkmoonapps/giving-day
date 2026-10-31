import { AppAlert, LoadingState } from '@giving-day/ui';
import { useTranslation } from 'react-i18next';
import {
  useListDayDeliveries,
  useUpdateDayDeliveryStatus,
} from '../api/generated/api';
import { VolunteerDeliveriesList } from './volunteer-deliveries-list';

export function VolunteerAssignedDeliveries({
  cityId,
  dayId,
}: {
  cityId: string;
  dayId: string;
}): JSX.Element {
  const { t } = useTranslation('volunteer');
  const { t: tCommon } = useTranslation('common');
  const deliveriesQuery = useListDayDeliveries(cityId, dayId);
  const updateMutation = useUpdateDayDeliveryStatus({
    mutation: {
      onSuccess: async () => {
        await deliveriesQuery.refetch();
      },
    },
  });

  if (deliveriesQuery.isError) {
    return (
      <AppAlert color="red" title={tCommon('error.unexpected_title')}>
        {t('deliveries_load_error')}
      </AppAlert>
    );
  }

  if (deliveriesQuery.isLoading || deliveriesQuery.data === undefined) {
    return <LoadingState label={tCommon('loading')} />;
  }

  return (
    <VolunteerDeliveriesList
      deliveries={deliveriesQuery.data.deliveries}
      pending={updateMutation.isPending}
      error={updateMutation.isError}
      onUpdateStatus={(deliveryId, data) => {
        updateMutation.mutate({
          cityId,
          dayId,
          deliveryId,
          data,
        });
      }}
    />
  );
}
