import { Stack, Textarea } from '@mantine/core';
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
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getListCityElderChangeRequestsQueryKey,
  useApproveCityElderChangeRequest,
  useListCityElderChangeRequests,
  useRejectCityElderChangeRequest,
  type ElderChangeRequestResponseDto,
  type ElderChangeRequestsResponseDto,
} from '../api/generated/api';
import { useSession } from '../auth/session-provider';
import {
  CHANGE_REQUEST_FIELD_LABEL_KEYS,
  CHANGE_REQUEST_SCALAR_FIELDS,
  displayNullableValue,
  personDisplayName,
  removeChangeRequest,
} from '../change-requests/change-request-view';
import { isUuid } from '../distribution-days/format-day';
import { AppChrome } from '../layout/app-chrome';

interface ReviewMutationContext {
  previous: ElderChangeRequestsResponseDto | undefined;
}

const RELATION_LABEL_KEYS: Record<
  ContactRelation,
  | 'relation_child'
  | 'relation_spouse'
  | 'relation_sibling'
  | 'relation_caregiver'
  | 'relation_social_worker'
  | 'relation_neighbor'
  | 'relation_other'
> = {
  child: 'relation_child',
  spouse: 'relation_spouse',
  sibling: 'relation_sibling',
  caregiver: 'relation_caregiver',
  social_worker: 'relation_social_worker',
  neighbor: 'relation_neighbor',
  other: 'relation_other',
};

function formatContactLine(
  contact: {
    name: string;
    relation: ContactRelation;
    phone: string;
    isPrimary: boolean;
  },
  relationLabel: string,
  primaryLabel: string
): string {
  const primary = contact.isPrimary ? ` · ${primaryLabel}` : '';
  return `${contact.name} (${relationLabel}) ${contact.phone}${primary}`;
}

function ChangeRequestCard({
  request,
  reviewNote,
  approving,
  rejecting,
  busy,
  onReviewNoteChange,
  onApprove,
  onReject,
}: {
  request: ElderChangeRequestResponseDto;
  reviewNote: string;
  approving: boolean;
  rejecting: boolean;
  busy: boolean;
  onReviewNoteChange: (value: string) => void;
  onApprove: () => void;
  onReject: () => void;
}): JSX.Element {
  const { t } = useTranslation('admin');

  return (
    <Stack
      gap="sm"
      data-testid={`change-request-card-${request.id}`}
      data-request-id={request.id}
    >
      <div>
        <AppTitle order={2}>{request.elder.fullName}</AppTitle>
        <AppText c="dimmed" size="sm">
          {t('requested_by')}:{' '}
          {personDisplayName(
            request.requestedBy.firstName,
            request.requestedBy.lastName,
            t('unnamed_volunteer')
          )}
        </AppText>
      </div>

      {request.reason !== null && request.reason.length > 0 ? (
        <AppText data-testid="change-request-reason">
          {t('request_reason')}: {request.reason}
        </AppText>
      ) : null}

      {CHANGE_REQUEST_SCALAR_FIELDS.map((field) => {
        const diff = request.changes[field];
        if (diff === undefined) {
          return null;
        }
        return (
          <Stack gap={2} key={field} data-testid={`change-diff-${field}`}>
            <AppText fw={600}>
              {t(CHANGE_REQUEST_FIELD_LABEL_KEYS[field])}
            </AppText>
            <AppText size="sm">
              {t('current_value')}:{' '}
              {displayNullableValue(diff.from, t('empty_value'))}
            </AppText>
            <AppText size="sm">
              {t('proposed_value')}:{' '}
              {displayNullableValue(diff.to, t('empty_value'))}
            </AppText>
          </Stack>
        );
      })}

      {request.changes.contacts !== undefined ? (
        <Stack gap="xs" data-testid="change-diff-contacts">
          <AppText fw={600}>
            {t(CHANGE_REQUEST_FIELD_LABEL_KEYS.contacts)}
          </AppText>
          <div>
            <AppText size="sm">{t('current_value')}</AppText>
            {request.changes.contacts.from.length === 0 ? (
              <AppText size="sm">{t('empty_value')}</AppText>
            ) : (
              request.changes.contacts.from.map((contact, index) => (
                <AppText size="sm" key={`from-${contact.phone}-${index}`}>
                  {formatContactLine(
                    contact,
                    t(RELATION_LABEL_KEYS[contact.relation]),
                    t('next_of_kin_primary')
                  )}
                </AppText>
              ))
            )}
          </div>
          <div>
            <AppText size="sm">{t('proposed_value')}</AppText>
            {request.changes.contacts.to.length === 0 ? (
              <AppText size="sm">{t('empty_value')}</AppText>
            ) : (
              request.changes.contacts.to.map((contact, index) => (
                <AppText size="sm" key={`to-${contact.phone}-${index}`}>
                  {formatContactLine(
                    contact,
                    t(RELATION_LABEL_KEYS[contact.relation]),
                    t('next_of_kin_primary')
                  )}
                </AppText>
              ))
            )}
          </div>
        </Stack>
      ) : null}

      <Textarea
        label={t('review_note_label')}
        placeholder={t('review_note_placeholder')}
        value={reviewNote}
        minRows={2}
        data-testid={`change-request-review-note-${request.id}`}
        onChange={(event) => {
          onReviewNoteChange(event.currentTarget.value);
        }}
      />
      <AppButton
        data-testid={`approve-change-request-${request.id}`}
        loading={approving}
        disabled={busy && !approving}
        onClick={onApprove}
      >
        {t('approve_change_request')}
      </AppButton>
      <AppButton
        variant="light"
        color="red"
        data-testid={`reject-change-request-${request.id}`}
        loading={rejecting}
        disabled={busy && !rejecting}
        onClick={onReject}
      >
        {t('reject_change_request')}
      </AppButton>
    </Stack>
  );
}

export function CoordinatorChangeRequestsPage(): JSX.Element {
  const { cityId } = useParams();
  const navigate = useNavigate();
  const { user } = useSession();
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation('common');
  const queryClient = useQueryClient();
  const validId = isUuid(cityId);
  const coordinatorCities =
    user === null ? [] : getActiveCoordinatorCities(user);
  const allowed = validId && coordinatorCities.includes(cityId ?? '');
  const listParams = { status: 'pending' as const };
  const queryKey = getListCityElderChangeRequestsQueryKey(
    cityId ?? '',
    listParams
  );
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const listQuery = useListCityElderChangeRequests(cityId ?? '', listParams, {
    query: { enabled: allowed },
  });

  const applyOptimisticRemoval = async (
    requestId: string
  ): Promise<ReviewMutationContext> => {
    await queryClient.cancelQueries({ queryKey });
    const previous =
      queryClient.getQueryData<ElderChangeRequestsResponseDto>(queryKey);
    queryClient.setQueryData(
      queryKey,
      removeChangeRequest(previous, requestId)
    );
    return { previous };
  };

  const restorePrevious = (
    _error: unknown,
    _variables: { cityId: string; requestId: string },
    context: ReviewMutationContext | undefined
  ): void => {
    if (context?.previous !== undefined) {
      queryClient.setQueryData(queryKey, context.previous);
    }
  };

  const refreshList = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey });
  };

  const approveMutation = useApproveCityElderChangeRequest<
    unknown,
    ReviewMutationContext
  >({
    mutation: {
      onMutate: async ({ requestId }) => applyOptimisticRemoval(requestId),
      onError: restorePrevious,
      onSettled: refreshList,
    },
  });
  const rejectMutation = useRejectCityElderChangeRequest<
    unknown,
    ReviewMutationContext
  >({
    mutation: {
      onMutate: async ({ requestId }) => applyOptimisticRemoval(requestId),
      onError: restorePrevious,
      onSettled: refreshList,
    },
  });

  const requests = listQuery.data?.changeRequests ?? [];
  const loading = listQuery.isLoading || listQuery.data === undefined;
  const failed = !allowed || listQuery.isError;
  const actingId =
    approveMutation.isPending && approveMutation.variables !== undefined
      ? approveMutation.variables.requestId
      : rejectMutation.isPending && rejectMutation.variables !== undefined
        ? rejectMutation.variables.requestId
        : null;
  const actingKind =
    actingId !== null && approveMutation.isPending
      ? 'approve'
      : actingId !== null && rejectMutation.isPending
        ? 'reject'
        : null;

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
        data-testid="coordinator-change-requests-page"
      >
        {!allowed ? (
          <AppAlert
            color="red"
            title={t('change_requests_no_access_title')}
            data-testid="change-requests-no-access"
          >
            {t('change_requests_no_access')}
          </AppAlert>
        ) : failed ? (
          <AppAlert color="red" title={tCommon('error.unexpected_title')}>
            {t('change_requests_load_error')}
          </AppAlert>
        ) : loading ? (
          <LoadingState label={tCommon('loading')} />
        ) : (
          <>
            <div>
              <AppTitle order={1}>{t('change_requests_title')}</AppTitle>
              <AppText c="dimmed" mt="sm">
                {t('change_requests_subtitle')}
              </AppText>
            </div>

            {approveMutation.isError ? (
              <AppAlert color="red" data-testid="approve-change-request-error">
                {t('approve_change_request_error')}
              </AppAlert>
            ) : null}
            {rejectMutation.isError ? (
              <AppAlert color="red" data-testid="reject-change-request-error">
                {t('reject_change_request_error')}
              </AppAlert>
            ) : null}

            {requests.length === 0 ? (
              <AppText data-testid="change-requests-empty">
                {t('change_requests_empty')}
              </AppText>
            ) : (
              <Stack gap="xl" data-testid="coordinator-change-requests-list">
                {requests.map((request) => {
                  const approving =
                    actingKind === 'approve' && actingId === request.id;
                  const rejecting =
                    actingKind === 'reject' && actingId === request.id;
                  return (
                    <ChangeRequestCard
                      key={request.id}
                      request={request}
                      reviewNote={reviewNotes[request.id] ?? ''}
                      approving={approving}
                      rejecting={rejecting}
                      busy={approving || rejecting}
                      onReviewNoteChange={(value) => {
                        setReviewNotes((current) => ({
                          ...current,
                          [request.id]: value,
                        }));
                      }}
                      onApprove={() => {
                        if (cityId === undefined) {
                          return;
                        }
                        approveMutation.mutate({
                          cityId,
                          requestId: request.id,
                        });
                      }}
                      onReject={() => {
                        if (cityId === undefined) {
                          return;
                        }
                        const note = (reviewNotes[request.id] ?? '').trim();
                        rejectMutation.mutate({
                          cityId,
                          requestId: request.id,
                          data: note.length > 0 ? { reviewNote: note } : {},
                        });
                      }}
                    />
                  );
                })}
              </Stack>
            )}
          </>
        )}
      </Stack>
    </AppChrome>
  );
}
