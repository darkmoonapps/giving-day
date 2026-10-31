import type {
  ContactRelation,
  DeliveryStatus,
  NotDeliveredReason,
  UpdateDeliveryStatus,
  VolunteerDelivery,
} from '@giving-day/shared';
import { AppAlert, AppBadge, AppButton, AppText } from '@giving-day/ui';
import { Group, Modal, NativeSelect, Stack, Textarea } from '@mantine/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ElderAddress } from './elder-address';

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

const STATUS_I18N_KEYS: Record<
  Extract<
    DeliveryStatus,
    'assigned' | 'picked' | 'delivered' | 'not_delivered'
  >,
  | 'delivery_status_assigned'
  | 'delivery_status_picked'
  | 'delivery_status_delivered'
  | 'delivery_status_not_delivered'
> = {
  assigned: 'delivery_status_assigned',
  picked: 'delivery_status_picked',
  delivered: 'delivery_status_delivered',
  not_delivered: 'delivery_status_not_delivered',
};

const NOT_DELIVERED_REASONS: NotDeliveredReason[] = [
  'not_home',
  'refused',
  'wrong_address',
  'hospitalized',
  'deceased',
  'other',
];

const REASON_I18N_KEYS: Record<
  NotDeliveredReason,
  | 'not_delivered_reason_not_home'
  | 'not_delivered_reason_refused'
  | 'not_delivered_reason_wrong_address'
  | 'not_delivered_reason_hospitalized'
  | 'not_delivered_reason_deceased'
  | 'not_delivered_reason_other'
> = {
  not_home: 'not_delivered_reason_not_home',
  refused: 'not_delivered_reason_refused',
  wrong_address: 'not_delivered_reason_wrong_address',
  hospitalized: 'not_delivered_reason_hospitalized',
  deceased: 'not_delivered_reason_deceased',
  other: 'not_delivered_reason_other',
};

export function VolunteerDeliveriesList({
  deliveries,
  pending,
  error,
  pendingElderIds = new Set<string>(),
  onSuggestCorrection,
  onUpdateStatus,
}: {
  deliveries: VolunteerDelivery[];
  pending: boolean;
  error: boolean;
  pendingElderIds?: ReadonlySet<string>;
  onSuggestCorrection?: (elderId: string) => void;
  onUpdateStatus: (deliveryId: string, data: UpdateDeliveryStatus) => void;
}): JSX.Element {
  const { t } = useTranslation('volunteer');
  const { t: tValidation } = useTranslation('validation');
  const [noteDeliveryId, setNoteDeliveryId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [reason, setReason] = useState<string>('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const labels = {
    entrance: t('entrance_label'),
    floor: t('floor_label'),
    apartment: t('apartment_label'),
  };

  const closeNoteModal = (): void => {
    setNoteDeliveryId(null);
    setNote('');
    setReason('');
    setNoteError(null);
    setReasonError(null);
  };

  const submitNotDelivered = (): void => {
    if (noteDeliveryId === null) {
      return;
    }
    const trimmedNote = note.trim();
    const parsedReason = NOT_DELIVERED_REASONS.find(
      (value) => value === reason
    );
    const nextNoteError =
      trimmedNote.length === 0 ? tValidation('required') : null;
    const nextReasonError =
      parsedReason === undefined ? tValidation('required') : null;
    setNoteError(nextNoteError);
    setReasonError(nextReasonError);
    if (nextNoteError !== null || nextReasonError !== null) {
      return;
    }
    if (parsedReason === undefined) {
      return;
    }
    onUpdateStatus(noteDeliveryId, {
      status: 'not_delivered',
      note: trimmedNote,
      notDeliveredReason: parsedReason,
    });
    closeNoteModal();
  };

  return (
    <>
      {error ? (
        <AppAlert color="red" data-testid="volunteer-status-error">
          {t('status_update_error')}
        </AppAlert>
      ) : null}

      {deliveries.length === 0 ? (
        <AppText data-testid="volunteer-deliveries-empty">
          {t('deliveries_empty')}
        </AppText>
      ) : (
        <Stack gap="md" data-testid="volunteer-deliveries-list">
          {deliveries.map((delivery) => (
            <Stack
              key={delivery.id}
              gap="xs"
              data-testid="volunteer-delivery-card"
              data-delivery-id={delivery.id}
              data-delivery-status={delivery.status}
            >
              <Group justify="space-between" align="flex-start" wrap="wrap">
                <AppText fw={600}>{delivery.elder.fullName}</AppText>
                <DeliveryStatusBadge status={delivery.status} />
              </Group>
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
                        <a
                          href={`tel:${contact.phone}`}
                          aria-label={t('call_next_of_kin', {
                            name: contact.name,
                          })}
                        >
                          {contact.phone}
                        </a>
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
              {pendingElderIds.has(delivery.elder.id) ? (
                <AppBadge
                  color="yellow"
                  size="sm"
                  data-testid="change-request-pending"
                >
                  {t('pending_change_request')}
                </AppBadge>
              ) : null}
              {onSuggestCorrection !== undefined ? (
                <AppButton
                  size="sm"
                  variant="light"
                  data-testid="suggest-correction"
                  onClick={() => {
                    onSuggestCorrection(delivery.elder.id);
                  }}
                >
                  {t('suggest_correction')}
                </AppButton>
              ) : null}
              {delivery.status === 'not_delivered' &&
              delivery.note !== null &&
              delivery.note.length > 0 ? (
                <AppText size="sm" data-testid="volunteer-not-delivered-note">
                  {t('not_delivered_note_label')}: {delivery.note}
                </AppText>
              ) : null}
              <DeliveryActions
                delivery={delivery}
                pending={pending}
                onPicked={() => {
                  onUpdateStatus(delivery.id, { status: 'picked' });
                }}
                onDelivered={() => {
                  onUpdateStatus(delivery.id, { status: 'delivered' });
                }}
                onNotDelivered={() => {
                  setNoteDeliveryId(delivery.id);
                }}
              />
            </Stack>
          ))}
        </Stack>
      )}

      <Modal
        opened={noteDeliveryId !== null}
        onClose={closeNoteModal}
        title={t('not_delivered_title')}
        data-testid="not-delivered-modal"
        transitionProps={{ duration: 0 }}
      >
        <Stack gap="sm">
          <NativeSelect
            label={t('not_delivered_reason_label')}
            aria-label={t('not_delivered_reason_label')}
            data-testid="not-delivered-reason"
            value={reason}
            error={reasonError ?? undefined}
            data={[
              { value: '', label: t('not_delivered_reason_placeholder') },
              ...NOT_DELIVERED_REASONS.map((value) => ({
                value,
                label: t(REASON_I18N_KEYS[value]),
              })),
            ]}
            onChange={(event) => {
              setReason(event.currentTarget.value);
              if (reasonError !== null) {
                setReasonError(null);
              }
            }}
          />
          <Textarea
            label={t('not_delivered_note_label')}
            placeholder={t('not_delivered_note_placeholder')}
            aria-label={t('not_delivered_note_label')}
            data-testid="not-delivered-note"
            value={note}
            error={noteError ?? undefined}
            minRows={3}
            onChange={(event) => {
              setNote(event.currentTarget.value);
              if (noteError !== null) {
                setNoteError(null);
              }
            }}
          />
          <AppButton
            color="red"
            onClick={submitNotDelivered}
            loading={pending}
            data-testid="submit-not-delivered"
          >
            {t('not_delivered_submit')}
          </AppButton>
          <AppButton variant="light" onClick={closeNoteModal}>
            {t('not_delivered_cancel')}
          </AppButton>
        </Stack>
      </Modal>
    </>
  );
}

function DeliveryStatusBadge({
  status,
}: {
  status: DeliveryStatus;
}): JSX.Element | null {
  const { t } = useTranslation('volunteer');
  if (
    status !== 'assigned' &&
    status !== 'picked' &&
    status !== 'delivered' &&
    status !== 'not_delivered'
  ) {
    return null;
  }
  const color =
    status === 'delivered'
      ? 'teal'
      : status === 'not_delivered'
        ? 'red'
        : status === 'picked'
          ? 'blue'
          : 'gray';
  return (
    <AppBadge color={color} size="sm" data-testid="volunteer-delivery-status">
      {t(STATUS_I18N_KEYS[status])}
    </AppBadge>
  );
}

function DeliveryActions({
  delivery,
  pending,
  onPicked,
  onDelivered,
  onNotDelivered,
}: {
  delivery: VolunteerDelivery;
  pending: boolean;
  onPicked: () => void;
  onDelivered: () => void;
  onNotDelivered: () => void;
}): JSX.Element | null {
  const { t } = useTranslation('volunteer');
  if (delivery.status === 'assigned') {
    return (
      <AppButton onClick={onPicked} loading={pending} data-testid="mark-picked">
        {t('mark_picked')}
      </AppButton>
    );
  }
  if (delivery.status === 'picked') {
    return (
      <Group grow>
        <AppButton
          onClick={onDelivered}
          loading={pending}
          data-testid="mark-delivered"
        >
          {t('mark_delivered')}
        </AppButton>
        <AppButton
          variant="light"
          color="red"
          onClick={onNotDelivered}
          loading={pending}
          data-testid="mark-not-delivered"
        >
          {t('mark_not_delivered')}
        </AppButton>
      </Group>
    );
  }
  return null;
}
