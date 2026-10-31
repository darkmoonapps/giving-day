import { NativeSelect, Stack, Table } from '@mantine/core';
import { useState } from 'react';
import {
  getActiveCoordinatorCities,
  type MatchEndReason,
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
  useCreateCityPermanentMatch,
  useEndCityMatch,
  useListCityMatches,
} from '../api/generated/api';
import { ApiError } from '../api/mutator';
import { useSession } from '../auth/session-provider';
import { isUuid } from '../distribution-days/format-day';
import { AppChrome } from '../layout/app-chrome';

const END_REASON_KEYS: Record<
  MatchEndReason,
  | 'end_reason_volunteer_left'
  | 'end_reason_elder_inactive'
  | 'end_reason_reassigned'
  | 'end_reason_other'
> = {
  volunteer_left: 'end_reason_volunteer_left',
  elder_inactive: 'end_reason_elder_inactive',
  reassigned: 'end_reason_reassigned',
  other: 'end_reason_other',
};

const END_REASONS = Object.keys(END_REASON_KEYS) as MatchEndReason[];

function isConflictError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}

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

export function CoordinatorMatchesPage(): JSX.Element {
  const { cityId } = useParams();
  const navigate = useNavigate();
  const { user } = useSession();
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation('common');
  const validId = isUuid(cityId);
  const coordinatorCities =
    user === null ? [] : getActiveCoordinatorCities(user);
  const allowed = validId && coordinatorCities.includes(cityId ?? '');
  const [elderId, setElderId] = useState('');
  const [volunteerId, setVolunteerId] = useState('');
  const [endReasons, setEndReasons] = useState<Record<string, MatchEndReason>>(
    {}
  );
  const [confirmingMatchId, setConfirmingMatchId] = useState<string | null>(
    null
  );
  const [endingMatchId, setEndingMatchId] = useState<string | null>(null);

  const matchesQuery = useListCityMatches(cityId ?? '', {
    query: { enabled: allowed },
  });
  const createMutation = useCreateCityPermanentMatch({
    mutation: {
      onSuccess: async () => {
        setElderId('');
        setVolunteerId('');
        await matchesQuery.refetch();
      },
    },
  });
  const endMutation = useEndCityMatch({
    mutation: {
      onSuccess: async () => {
        setConfirmingMatchId(null);
        setEndingMatchId(null);
        await matchesQuery.refetch();
      },
      onError: () => {
        setEndingMatchId(null);
      },
    },
  });

  const payload = matchesQuery.data;
  const loading = matchesQuery.isLoading || payload === undefined;
  const denied = validId && !allowed;
  const failed = !validId || matchesQuery.isError;
  const createConflict = isConflictError(createMutation.error);

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
        data-testid="coordinator-matches-page"
      >
        {denied ? (
          <AppAlert
            color="red"
            title={t('matches_no_access_title')}
            data-testid="matches-no-access"
          >
            {t('matches_no_access')}
          </AppAlert>
        ) : failed ? (
          <AppAlert color="red" title={tCommon('error.unexpected_title')}>
            {t('matches_load_error')}
          </AppAlert>
        ) : loading || payload === undefined ? (
          <LoadingState label={tCommon('loading')} />
        ) : (
          <>
            <div>
              <AppTitle order={1}>{t('matches_title')}</AppTitle>
              <AppText c="dimmed" mt="sm">
                {t('matches_subtitle')}
              </AppText>
            </div>

            {createMutation.isError ? (
              <AppAlert color="red" data-testid="create-match-error">
                {createConflict ? t('match_conflict') : t('create_match_error')}
              </AppAlert>
            ) : null}
            {endMutation.isError ? (
              <AppAlert color="red" data-testid="end-match-error">
                {t('end_match_error')}
              </AppAlert>
            ) : null}

            {payload.matches.length === 0 ? (
              <AppText data-testid="matches-empty">
                {t('matches_empty')}
              </AppText>
            ) : (
              <Table highlightOnHover data-testid="coordinator-matches-table">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t('elder_column')}</Table.Th>
                    <Table.Th>{t('volunteer_column')}</Table.Th>
                    <Table.Th>{t('starts_at_column')}</Table.Th>
                    <Table.Th>{t('end_match')}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {payload.matches.map((match) => {
                    const reason = endReasons[match.id] ?? 'reassigned';
                    const confirming = confirmingMatchId === match.id;
                    const ending =
                      endMutation.isPending && endingMatchId === match.id;
                    return (
                      <Table.Tr
                        key={match.id}
                        data-testid={`match-row-${match.id}`}
                      >
                        <Table.Td>{match.elder.fullName}</Table.Td>
                        <Table.Td>
                          {personName(
                            match.volunteer.firstName,
                            match.volunteer.lastName,
                            t('unnamed_volunteer')
                          )}
                        </Table.Td>
                        <Table.Td>{match.startsAt}</Table.Td>
                        <Table.Td>
                          <Stack gap="xs">
                            <NativeSelect
                              aria-label={t('end_reason_label')}
                              data={END_REASONS.map((value) => ({
                                value,
                                label: t(END_REASON_KEYS[value]),
                              }))}
                              value={reason}
                              onChange={(event) => {
                                const next = event.currentTarget
                                  .value as MatchEndReason;
                                setEndReasons((current) => ({
                                  ...current,
                                  [match.id]: next,
                                }));
                              }}
                            />
                            {confirming ? (
                              <>
                                <AppText size="sm">
                                  {t('end_match_confirm')}
                                </AppText>
                                <AppButton
                                  size="xs"
                                  data-testid={`confirm-end-match-${match.id}`}
                                  loading={ending}
                                  onClick={() => {
                                    if (!validId) {
                                      return;
                                    }
                                    setEndingMatchId(match.id);
                                    endMutation.mutate({
                                      cityId,
                                      matchId: match.id,
                                      data: { endReason: reason },
                                    });
                                  }}
                                >
                                  {t('confirm_end_match')}
                                </AppButton>
                                <AppButton
                                  size="xs"
                                  variant="light"
                                  data-testid={`cancel-end-match-${match.id}`}
                                  disabled={ending}
                                  onClick={() => {
                                    setConfirmingMatchId(null);
                                  }}
                                >
                                  {t('cancel_end_match')}
                                </AppButton>
                              </>
                            ) : (
                              <AppButton
                                size="xs"
                                variant="light"
                                data-testid={`end-match-${match.id}`}
                                onClick={() => {
                                  setConfirmingMatchId(match.id);
                                }}
                              >
                                {t('end_match')}
                              </AppButton>
                            )}
                          </Stack>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            )}

            <Stack gap="sm" data-testid="create-match-form">
              <AppTitle order={2}>{t('create_match')}</AppTitle>
              {payload.unmatchedElders.length === 0 ? (
                <AppText c="dimmed">{t('no_unmatched_elders')}</AppText>
              ) : payload.matchableVolunteers.length === 0 ? (
                <AppText c="dimmed">{t('no_matchable_volunteers')}</AppText>
              ) : (
                <>
                  <NativeSelect
                    aria-label={t('select_elder')}
                    data={[
                      { value: '', label: t('select_elder') },
                      ...payload.unmatchedElders.map((elder) => ({
                        value: elder.id,
                        label: elder.fullName,
                      })),
                    ]}
                    value={elderId}
                    onChange={(event) => {
                      setElderId(event.currentTarget.value);
                    }}
                  />
                  <NativeSelect
                    aria-label={t('select_volunteer')}
                    data={[
                      { value: '', label: t('select_volunteer') },
                      ...payload.matchableVolunteers.map((volunteer) => ({
                        value: volunteer.id,
                        label: personName(
                          volunteer.firstName,
                          volunteer.lastName,
                          t('unnamed_volunteer')
                        ),
                      })),
                    ]}
                    value={volunteerId}
                    onChange={(event) => {
                      setVolunteerId(event.currentTarget.value);
                    }}
                  />
                  <AppButton
                    data-testid="create-match-submit"
                    disabled={elderId.length === 0 || volunteerId.length === 0}
                    loading={createMutation.isPending}
                    onClick={() => {
                      if (!validId) {
                        return;
                      }
                      createMutation.mutate({
                        cityId,
                        data: { elderId, volunteerId },
                      });
                    }}
                  >
                    {t('create_match')}
                  </AppButton>
                </>
              )}
            </Stack>
          </>
        )}
      </Stack>
    </AppChrome>
  );
}
