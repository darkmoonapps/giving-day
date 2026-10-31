import { AppAlert, LoadingState } from '@giving-day/ui';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useListDayDeliveries,
  useUpdateDayDeliveryStatus,
} from '../api/generated/api';
import {
  areAllDeliveriesFinished,
  deliveriesJustFinished,
} from '../thank-you/delivery-completion';
import { ThankYouScreen } from '../thank-you/thank-you-screen';
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
  const [showFinishedThanks, setShowFinishedThanks] = useState(false);
  const previouslyFinishedRef = useRef<boolean | null>(null);
  const deliveriesQuery = useListDayDeliveries(cityId, dayId);
  const updateMutation = useUpdateDayDeliveryStatus({
    mutation: {
      onSuccess: async () => {
        await deliveriesQuery.refetch();
      },
    },
  });

  const deliveries = deliveriesQuery.data?.deliveries;
  const finished =
    deliveries === undefined ? null : areAllDeliveriesFinished(deliveries);

  useEffect(() => {
    if (finished === null) {
      return;
    }
    if (deliveriesJustFinished(previouslyFinishedRef.current, finished)) {
      setShowFinishedThanks(true);
    }
    previouslyFinishedRef.current = finished;
  }, [finished]);

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
    <>
      {showFinishedThanks ? (
        <ThankYouScreen
          reason="finished"
          onDismiss={() => {
            setShowFinishedThanks(false);
          }}
        />
      ) : null}
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
    </>
  );
}
