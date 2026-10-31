import { Stack, Table } from '@mantine/core';
import { getActiveCoordinatorCities } from '@giving-day/shared';
import {
  AppAlert,
  AppButton,
  AppText,
  AppTitle,
  LoadingState,
} from '@giving-day/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getListPendingCityMembershipsQueryKey,
  useApproveCityMembership,
  useListPendingCityMemberships,
  useRejectCityMembership,
  type CityPendingMembershipsResponseDto,
} from '../api/generated/api';
import { useSession } from '../auth/session-provider';
import { isUuid } from '../distribution-days/format-day';
import { useLanguage } from '../i18n/use-language';
import { AppChrome } from '../layout/app-chrome';
import {
  formatMembershipRequestDate,
  membershipDisplayName,
  removePendingMembership,
} from '../memberships/pending-membership';

interface PendingMutationContext {
  previous: CityPendingMembershipsResponseDto | undefined;
}

export function CoordinatorPendingMembershipsPage(): JSX.Element {
  const { cityId } = useParams();
  const navigate = useNavigate();
  const { user } = useSession();
  const { language } = useLanguage();
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation('common');
  const queryClient = useQueryClient();
  const validId = isUuid(cityId);
  const coordinatorCities =
    user === null ? [] : getActiveCoordinatorCities(user);
  const allowed = validId && coordinatorCities.includes(cityId ?? '');
  const queryKey = getListPendingCityMembershipsQueryKey(cityId ?? '');

  const pendingQuery = useListPendingCityMemberships(cityId ?? '', {
    query: { enabled: allowed },
  });

  const applyOptimisticRemoval = async (
    membershipId: string
  ): Promise<PendingMutationContext> => {
    await queryClient.cancelQueries({ queryKey });
    const previous =
      queryClient.getQueryData<CityPendingMembershipsResponseDto>(queryKey);
    queryClient.setQueryData(
      queryKey,
      removePendingMembership(previous, membershipId)
    );
    return { previous };
  };

  const restorePrevious = (
    _error: unknown,
    _variables: { cityId: string; membershipId: string },
    context: PendingMutationContext | undefined
  ): void => {
    if (context?.previous !== undefined) {
      queryClient.setQueryData(queryKey, context.previous);
    }
  };

  const refreshList = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey });
  };

  const approveMutation = useApproveCityMembership<
    unknown,
    PendingMutationContext
  >({
    mutation: {
      onMutate: async ({ membershipId }) =>
        applyOptimisticRemoval(membershipId),
      onError: restorePrevious,
      onSettled: refreshList,
    },
  });
  const rejectMutation = useRejectCityMembership<
    unknown,
    PendingMutationContext
  >({
    mutation: {
      onMutate: async ({ membershipId }) =>
        applyOptimisticRemoval(membershipId),
      onError: restorePrevious,
      onSettled: refreshList,
    },
  });

  const memberships = pendingQuery.data?.memberships ?? [];
  const loading = pendingQuery.isLoading || pendingQuery.data === undefined;
  const failed = !allowed || pendingQuery.isError;
  const actingId =
    approveMutation.isPending && approveMutation.variables !== undefined
      ? approveMutation.variables.membershipId
      : rejectMutation.isPending && rejectMutation.variables !== undefined
        ? rejectMutation.variables.membershipId
        : null;
  const actingKind =
    actingId !== null && approveMutation.isPending
      ? 'approve'
      : actingId !== null && rejectMutation.isPending
        ? 'reject'
        : null;

  const runAction = (
    membershipId: string,
    action: 'approve' | 'reject'
  ): void => {
    if (!validId) {
      return;
    }
    const payload = { cityId, membershipId };
    if (action === 'approve') {
      approveMutation.mutate(payload);
      return;
    }
    rejectMutation.mutate(payload);
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
        data-testid="coordinator-join-requests-page"
      >
        {failed ? (
          <AppAlert color="red" title={tCommon('error.unexpected_title')}>
            {t('join_requests_load_error')}
          </AppAlert>
        ) : loading ? (
          <LoadingState label={tCommon('loading')} />
        ) : (
          <>
            <div>
              <AppTitle order={1}>{t('join_requests_title')}</AppTitle>
              <AppText c="dimmed" mt="sm">
                {t('join_requests_subtitle')}
              </AppText>
            </div>

            {approveMutation.isError ? (
              <AppAlert color="red" data-testid="approve-membership-error">
                {t('approve_membership_error')}
              </AppAlert>
            ) : null}
            {rejectMutation.isError ? (
              <AppAlert color="red" data-testid="reject-membership-error">
                {t('reject_membership_error')}
              </AppAlert>
            ) : null}

            {memberships.length === 0 ? (
              <AppText data-testid="join-requests-empty">
                {t('join_requests_empty')}
              </AppText>
            ) : (
              <Table
                highlightOnHover
                data-testid="coordinator-join-requests-table"
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t('volunteer_column')}</Table.Th>
                    <Table.Th>{t('phone_column')}</Table.Th>
                    <Table.Th>{t('request_date_column')}</Table.Th>
                    <Table.Th>{t('role_column')}</Table.Th>
                    <Table.Th>{t('actions_column')}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {memberships.map((membership) => {
                    const approving =
                      actingKind === 'approve' &&
                      actingId === membership.membershipId;
                    const rejecting =
                      actingKind === 'reject' &&
                      actingId === membership.membershipId;
                    const busy = approving || rejecting;

                    return (
                      <Table.Tr
                        key={membership.membershipId}
                        data-testid={`join-request-row-${membership.membershipId}`}
                      >
                        <Table.Td>
                          {membershipDisplayName(
                            membership.firstName,
                            membership.lastName,
                            t('unnamed_requester')
                          )}
                        </Table.Td>
                        <Table.Td>
                          {membership.phone ?? t('no_reason')}
                        </Table.Td>
                        <Table.Td>
                          {formatMembershipRequestDate(
                            membership.createdAt,
                            language
                          )}
                        </Table.Td>
                        <Table.Td>
                          {membership.role === 'coordinator'
                            ? t('role_coordinator')
                            : t('role_volunteer')}
                        </Table.Td>
                        <Table.Td>
                          <Stack gap="xs">
                            <AppButton
                              size="xs"
                              data-testid={`approve-membership-${membership.membershipId}`}
                              loading={approving}
                              disabled={busy && !approving}
                              onClick={() => {
                                runAction(membership.membershipId, 'approve');
                              }}
                            >
                              {t('approve_membership')}
                            </AppButton>
                            <AppButton
                              size="xs"
                              variant="light"
                              data-testid={`reject-membership-${membership.membershipId}`}
                              loading={rejecting}
                              disabled={busy && !rejecting}
                              onClick={() => {
                                runAction(membership.membershipId, 'reject');
                              }}
                            >
                              {t('reject_membership')}
                            </AppButton>
                          </Stack>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            )}
          </>
        )}
      </Stack>
    </AppChrome>
  );
}
