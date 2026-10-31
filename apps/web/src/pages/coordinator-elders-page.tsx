import { Checkbox, Stack, Table } from '@mantine/core';
import { useState } from 'react';
import { getActiveCoordinatorCities } from '@giving-day/shared';
import {
  AppAlert,
  AppButton,
  AppText,
  AppTitle,
  LoadingState,
} from '@giving-day/ui';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  useCreateCityElder,
  useDeactivateCityElder,
  useListCityElders,
  useUpdateCityElder,
  type ElderResponseDto,
} from '../api/generated/api';
import { useSession } from '../auth/session-provider';
import { isUuid } from '../distribution-days/format-day';
import { ElderForm } from '../elders/elder-form';
import {
  canDeactivateElder,
  canEditElder,
  canReactivateElder,
  elderListParams,
  elderToFormValues,
  isElderArchived,
} from '../elders/elder-form-values';
import { AppChrome } from '../layout/app-chrome';

const STATUS_LABEL_KEYS = {
  active: 'elder_status_active',
  paused: 'elder_status_paused',
  hospitalized: 'elder_status_hospitalized',
  moved: 'elder_status_moved',
  deceased: 'elder_status_deceased',
  removed: 'elder_status_removed',
} as const;

function elderAddress(elder: ElderResponseDto): string {
  return `${elder.street} ${elder.houseNumber}`.trim();
}

export function CoordinatorEldersPage(): JSX.Element {
  const { cityId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useSession();
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation('common');
  const validId = isUuid(cityId);
  const coordinatorCities =
    user === null ? [] : getActiveCoordinatorCities(user);
  const allowed = validId && coordinatorCities.includes(cityId ?? '');
  const focusedElderId = searchParams.get('elderId') ?? undefined;
  const [showInactive, setShowInactive] = useState(false);
  const [editingElderId, setEditingElderId] = useState<string | null>(
    isUuid(focusedElderId) ? focusedElderId : null
  );
  const [confirmingElderId, setConfirmingElderId] = useState<string | null>(
    null
  );
  const [confirmingAction, setConfirmingAction] = useState<
    'deactivate' | 'reactivate' | null
  >(null);

  const listParams = elderListParams(showInactive);
  const eldersQuery = useListCityElders(cityId ?? '', listParams, {
    query: { enabled: allowed },
  });
  const createMutation = useCreateCityElder({
    mutation: {
      onSuccess: async () => {
        setEditingElderId(null);
        await eldersQuery.refetch();
      },
    },
  });
  const updateMutation = useUpdateCityElder({
    mutation: {
      onSuccess: async () => {
        setEditingElderId(null);
        setConfirmingElderId(null);
        setConfirmingAction(null);
        await eldersQuery.refetch();
      },
      onError: () => {
        setConfirmingElderId(null);
        setConfirmingAction(null);
      },
    },
  });
  const deactivateMutation = useDeactivateCityElder({
    mutation: {
      onSuccess: async () => {
        setConfirmingElderId(null);
        setConfirmingAction(null);
        await eldersQuery.refetch();
      },
      onError: () => {
        setConfirmingElderId(null);
        setConfirmingAction(null);
      },
    },
  });

  const elders = eldersQuery.data?.elders ?? [];
  const loading = eldersQuery.isLoading || eldersQuery.data === undefined;
  const failed = !allowed || eldersQuery.isError;
  const editingElder =
    editingElderId === null
      ? null
      : (elders.find((elder) => elder.id === editingElderId) ?? null);
  const mutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    deactivateMutation.isPending;

  const startConfirm = (
    elderId: string,
    action: 'deactivate' | 'reactivate'
  ): void => {
    setConfirmingElderId(elderId);
    setConfirmingAction(action);
  };

  const cancelConfirm = (): void => {
    setConfirmingElderId(null);
    setConfirmingAction(null);
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
      <Stack gap="lg" component="section" data-testid="coordinator-elders-page">
        {failed ? (
          <AppAlert color="red" title={tCommon('error.unexpected_title')}>
            {t('elders_load_error')}
          </AppAlert>
        ) : loading ? (
          <LoadingState label={tCommon('loading')} />
        ) : (
          <>
            <div>
              <AppTitle order={1}>{t('elders_title')}</AppTitle>
              <AppText c="dimmed" mt="sm">
                {t('elders_subtitle')}
              </AppText>
            </div>

            {createMutation.isError ? (
              <AppAlert color="red" data-testid="create-elder-error">
                {t('create_elder_error')}
              </AppAlert>
            ) : null}
            {updateMutation.isError ? (
              <AppAlert color="red" data-testid="update-elder-error">
                {confirmingAction === 'reactivate'
                  ? t('reactivate_elder_error')
                  : t('update_elder_error')}
              </AppAlert>
            ) : null}
            {deactivateMutation.isError ? (
              <AppAlert color="red" data-testid="deactivate-elder-error">
                {t('deactivate_elder_error')}
              </AppAlert>
            ) : null}

            <Checkbox
              label={t('show_inactive_elders')}
              checked={showInactive}
              data-testid="show-inactive-elders"
              onChange={(event) => {
                setShowInactive(event.currentTarget.checked);
              }}
            />

            {elders.length === 0 ? (
              <AppText data-testid="elders-empty">
                {showInactive ? t('elders_inactive_empty') : t('elders_empty')}
              </AppText>
            ) : (
              <Table highlightOnHover data-testid="coordinator-elders-table">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t('elder_column')}</Table.Th>
                    <Table.Th>{t('address_column')}</Table.Th>
                    <Table.Th>{t('phone_column')}</Table.Th>
                    <Table.Th>{t('status_column')}</Table.Th>
                    <Table.Th>{t('notes_column')}</Table.Th>
                    <Table.Th>{t('actions_column')}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {elders.map((elder) => {
                    const confirmingDeactivate =
                      confirmingElderId === elder.id &&
                      confirmingAction === 'deactivate';
                    const confirmingReactivate =
                      confirmingElderId === elder.id &&
                      confirmingAction === 'reactivate';
                    const deactivating =
                      deactivateMutation.isPending &&
                      confirmingElderId === elder.id;
                    const reactivating =
                      updateMutation.isPending &&
                      confirmingAction === 'reactivate' &&
                      confirmingElderId === elder.id;

                    return (
                      <Table.Tr
                        key={elder.id}
                        data-testid={`elder-row-${elder.id}`}
                      >
                        <Table.Td>{elder.fullName}</Table.Td>
                        <Table.Td>{elderAddress(elder)}</Table.Td>
                        <Table.Td>{elder.phone ?? t('no_reason')}</Table.Td>
                        <Table.Td>
                          {t(STATUS_LABEL_KEYS[elder.status])}
                        </Table.Td>
                        <Table.Td>{elder.notes ?? t('no_reason')}</Table.Td>
                        <Table.Td>
                          <Stack gap="xs">
                            {canEditElder(elder) ? (
                              <AppButton
                                size="xs"
                                variant="light"
                                data-testid={`edit-elder-${elder.id}`}
                                onClick={() => {
                                  setEditingElderId(elder.id);
                                  cancelConfirm();
                                }}
                              >
                                {t('edit_elder')}
                              </AppButton>
                            ) : null}
                            {canDeactivateElder(elder) ? (
                              confirmingDeactivate ? (
                                <>
                                  <AppText size="sm">
                                    {t('deactivate_elder_confirm')}
                                  </AppText>
                                  <AppButton
                                    size="xs"
                                    data-testid={`confirm-deactivate-elder-${elder.id}`}
                                    loading={deactivating}
                                    onClick={() => {
                                      if (!validId) {
                                        return;
                                      }
                                      deactivateMutation.mutate({
                                        cityId,
                                        elderId: elder.id,
                                      });
                                    }}
                                  >
                                    {t('confirm_deactivate_elder')}
                                  </AppButton>
                                  <AppButton
                                    size="xs"
                                    variant="light"
                                    data-testid={`cancel-deactivate-elder-${elder.id}`}
                                    disabled={deactivating}
                                    onClick={cancelConfirm}
                                  >
                                    {t('cancel_deactivate_elder')}
                                  </AppButton>
                                </>
                              ) : (
                                <AppButton
                                  size="xs"
                                  variant="light"
                                  data-testid={`deactivate-elder-${elder.id}`}
                                  onClick={() => {
                                    startConfirm(elder.id, 'deactivate');
                                  }}
                                >
                                  {t('deactivate_elder')}
                                </AppButton>
                              )
                            ) : null}
                            {canReactivateElder(elder) ? (
                              confirmingReactivate ? (
                                <>
                                  <AppText size="sm">
                                    {t('reactivate_elder_confirm')}
                                  </AppText>
                                  <AppButton
                                    size="xs"
                                    data-testid={`confirm-reactivate-elder-${elder.id}`}
                                    loading={reactivating}
                                    onClick={() => {
                                      if (!validId) {
                                        return;
                                      }
                                      updateMutation.mutate({
                                        cityId,
                                        elderId: elder.id,
                                        data: { status: 'active' },
                                      });
                                    }}
                                  >
                                    {t('confirm_reactivate_elder')}
                                  </AppButton>
                                  <AppButton
                                    size="xs"
                                    variant="light"
                                    data-testid={`cancel-reactivate-elder-${elder.id}`}
                                    disabled={reactivating}
                                    onClick={cancelConfirm}
                                  >
                                    {t('cancel_reactivate_elder')}
                                  </AppButton>
                                </>
                              ) : (
                                <AppButton
                                  size="xs"
                                  variant="light"
                                  data-testid={`reactivate-elder-${elder.id}`}
                                  onClick={() => {
                                    startConfirm(elder.id, 'reactivate');
                                  }}
                                >
                                  {t('reactivate_elder')}
                                </AppButton>
                              )
                            ) : null}
                            {isElderArchived(elder) ? (
                              <AppText size="sm" c="dimmed">
                                {t('elder_archived')}
                              </AppText>
                            ) : null}
                          </Stack>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            )}

            {editingElder === null ? (
              <ElderForm
                key="create"
                mode="create"
                submitting={mutating}
                onSubmit={(data) => {
                  if (!validId) {
                    return;
                  }
                  createMutation.mutate({ cityId, data });
                }}
              />
            ) : (
              <ElderForm
                key={editingElder.id}
                mode="edit"
                initialValues={elderToFormValues(editingElder)}
                submitting={mutating}
                onCancel={() => {
                  setEditingElderId(null);
                }}
                onSubmit={(data) => {
                  if (!validId) {
                    return;
                  }
                  updateMutation.mutate({
                    cityId,
                    elderId: editingElder.id,
                    data,
                  });
                }}
              />
            )}
          </>
        )}
      </Stack>
    </AppChrome>
  );
}
