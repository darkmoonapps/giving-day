import { AppAlert, LoadingState } from '@giving-day/ui';
import { Modal } from '@mantine/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useCreateCityElderChangeRequest,
  useGetVolunteerDayRoute,
  useListCityElderChangeRequests,
  useListDayDeliveries,
  useUpdateDayDeliveryStatus,
} from '../api/generated/api';
import { VolunteerChangeRequestForm } from '../change-requests/volunteer-change-request-form';
import { pendingElderIds } from '../change-requests/change-request-view';
import { useLanguage } from '../i18n/use-language';
import {
  areAllDeliveriesFinished,
  deliveriesJustFinished,
} from '../thank-you/delivery-completion';
import { ThankYouScreen } from '../thank-you/thank-you-screen';
import { applyRouteOrder, routeMetaByDeliveryId } from './apply-route-order';
import { localizedCityName } from './navigation-links';
import { VolunteerDeliveriesList } from './volunteer-deliveries-list';
import { VolunteerRoutePanel } from './volunteer-route-panel';

export function VolunteerAssignedDeliveries({
  cityId,
  dayId,
}: {
  cityId: string;
  dayId: string;
}): JSX.Element {
  const { t } = useTranslation('volunteer');
  const { t: tCommon } = useTranslation('common');
  const { language } = useLanguage();
  const [showFinishedThanks, setShowFinishedThanks] = useState(false);
  const [editingElderId, setEditingElderId] = useState<string | null>(null);
  const [submittedElderIds, setSubmittedElderIds] = useState<string[]>([]);
  const previouslyFinishedRef = useRef<boolean | null>(null);
  const deliveriesQuery = useListDayDeliveries(cityId, dayId);
  const routeQuery = useGetVolunteerDayRoute(cityId, dayId);
  const pendingQuery = useListCityElderChangeRequests(cityId, {
    status: 'pending',
  });
  const createChangeRequest = useCreateCityElderChangeRequest({
    mutation: {
      onSuccess: async (created) => {
        setSubmittedElderIds((current) =>
          current.includes(created.elderId)
            ? current
            : [...current, created.elderId]
        );
        setEditingElderId(null);
        await pendingQuery.refetch();
      },
    },
  });
  const updateMutation = useUpdateDayDeliveryStatus({
    mutation: {
      onSuccess: async () => {
        await deliveriesQuery.refetch();
      },
    },
  });

  const deliveries = useMemo(() => {
    const rows = deliveriesQuery.data?.deliveries;
    if (rows === undefined) {
      return undefined;
    }
    return applyRouteOrder(rows, routeQuery.data);
  }, [deliveriesQuery.data?.deliveries, routeQuery.data]);
  const routeMeta = useMemo(
    () => routeMetaByDeliveryId(routeQuery.data),
    [routeQuery.data]
  );
  const finished =
    deliveries === undefined ? null : areAllDeliveriesFinished(deliveries);
  const pendingIds = useMemo(() => {
    const fromApi = pendingElderIds(pendingQuery.data?.changeRequests ?? []);
    return new Set([...fromApi, ...submittedElderIds]);
  }, [pendingQuery.data?.changeRequests, submittedElderIds]);
  const editingElder =
    editingElderId === null || deliveries === undefined
      ? null
      : (deliveries.find((delivery) => delivery.elder.id === editingElderId)
          ?.elder ?? null);

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
      <VolunteerRoutePanel
        route={routeQuery.data}
        cityName={localizedCityName(
          deliveriesQuery.data.cityNameHe,
          deliveriesQuery.data.cityNameEn,
          language
        )}
        loadError={routeQuery.isError}
      />
      <VolunteerDeliveriesList
        deliveries={deliveries ?? deliveriesQuery.data.deliveries}
        pending={updateMutation.isPending}
        error={updateMutation.isError}
        cityName={localizedCityName(
          deliveriesQuery.data.cityNameHe,
          deliveriesQuery.data.cityNameEn,
          language
        )}
        centerAddress={deliveriesQuery.data.centerAddress}
        routeMeta={routeMeta}
        pendingElderIds={pendingIds}
        onSuggestCorrection={setEditingElderId}
        onUpdateStatus={(deliveryId, data) => {
          updateMutation.mutate({
            cityId,
            dayId,
            deliveryId,
            data,
          });
        }}
      />
      <Modal
        opened={editingElder !== null}
        onClose={() => {
          if (!createChangeRequest.isPending) {
            setEditingElderId(null);
          }
        }}
        title={t('suggest_correction_title')}
        data-testid="change-request-modal"
        transitionProps={{ duration: 0 }}
      >
        {editingElder !== null ? (
          <VolunteerChangeRequestForm
            elder={editingElder}
            submitting={createChangeRequest.isPending}
            error={createChangeRequest.isError}
            onSubmit={(data) => {
              createChangeRequest.mutate({ cityId, data });
            }}
            onCancel={() => {
              setEditingElderId(null);
            }}
          />
        ) : null}
      </Modal>
    </>
  );
}
