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
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useCreateDayOneTimeMatch,
  useEndDayOneTimeMatch,
  useGetDistributionDay,
  useListDayOneTimeMatches,
} from '../api/generated/api';
import { ApiError } from '../api/mutator';
import { useSession } from '../auth/session-provider';
import {
  formatDistributionDate,
  isUuid,
} from '../distribution-days/format-day';
import { useLanguage } from '../i18n/use-language';
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

function isVolunteerNotConfirmedError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.code === 'matches.volunteer_not_confirmed'
  );
}

function createOneTimeMatchErrorMessage(
  error: unknown,
  t: TFunction<'admin'>
): string {
  if (isConflictError(error)) {
    return t('one_time_match_conflict');
  }
  if (isVolunteerNotConfirmedError(error)) {
    return t('one_time_match_volunteer_not_confirmed');
  }
  return t('create_one_time_match_error');
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

export function CoordinatorOneTimeMatchesPage(): JSX.Element {
  const { cityId, dayId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useSession();
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation('common');
  const validIds = isUuid(cityId) && isUuid(dayId);
  const coordinatorCities =
    user === null ? [] : getActiveCoordinatorCities(user);
  const allowed =
    validIds && coordinatorCities.includes(cityId ?? '') && dayId !== undefined;
  const [elderId, setElderId] = useState('');
  const [volunteerId, setVolunteerId] = useState('');
  const [endReasons, setEndReasons] = useState<Record<string, MatchEndReason>>(
    {}
  );
  const [confirmingMatchId, setConfirmingMatchId] = useState<string | null>(
    null
  );
  const [endingMatchId, setEndingMatchId] = useState<string | null>(null);

  const dayQuery = useGetDistributionDay(cityId ?? '', dayId ?? '', {
    query: { enabled: allowed },
  });
  const matchesQuery = useListDayOneTimeMatches(cityId ?? '', dayId ?? '', {
    query: { enabled: allowed },
  });
  const createMutation = useCreateDayOneTimeMatch({
    mutation: {
      onSuccess: async () => {
        setElderId('');
        setVolunteerId('');
        await matchesQuery.refetch();
      },
    },
  });
  const endMutation = useEndDayOneTimeMatch({
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
  const day = dayQuery.data;
  const loading =
    dayQuery.isLoading ||
    matchesQuery.isLoading ||
    payload === undefined ||
    day === undefined;
  const denied = validIds && !allowed;
  const failed = !validIds || dayQuery.isError || matchesQuery.isError;
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
        data-testid="coordinator-one-time-matches-page"
      >
        {denied ? (
          <AppAlert
            color="red"
            title={t('one_time_matches_no_access_title')}
            data-testid="one-time-matches-no-access"
          >
            {t('one_time_matches_no_access')}
          </AppAlert>
        ) : failed ? (
          <AppAlert color="red" title={tCommon('error.unexpected_title')}>
            {t('one_time_matches_load_error')}
          </AppAlert>
        ) : loading || payload === undefined || day === undefined ? (
          <LoadingState label={tCommon('loading')} />
        ) : (
          <>
            <div>
              <AppTitle order={1}>{t('one_time_matches_title')}</AppTitle>
              <AppText mt="xs">
                {formatDistributionDate(day.date, language)}
              </AppText>
              <AppText c="dimmed" mt="sm">
                {t('one_time_matches_subtitle')}
              </AppText>
            </div>

            {createMutation.isError ? (
              <AppAlert color="red" data-testid="create-one-time-match-error">
                {createOneTimeMatchErrorMessage(createMutation.error, t)}
              </AppAlert>
            ) : null}
            {endMutation.isError ? (
              <AppAlert color="red" data-testid="end-one-time-match-error">
                {t('end_one_time_match_error')}
              </AppAlert>
            ) : null}

            {payload.matches.length === 0 ? (
              <AppText data-testid="one-time-matches-empty">
                {t('one_time_matches_empty')}
              </AppText>
            ) : (
              <Table
                highlightOnHover
                data-testid="coordinator-one-time-matches-table"
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t('elder_column')}</Table.Th>
                    <Table.Th>{t('volunteer_column')}</Table.Th>
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
                        data-testid={`one-time-match-row-${match.id}`}
                      >
                        <Table.Td>{match.elder.fullName}</Table.Td>
                        <Table.Td>
                          {personName(
                            match.volunteer.firstName,
                            match.volunteer.lastName,
                            t('unnamed_volunteer')
                          )}
                        </Table.Td>
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
                                  {t('end_one_time_match_confirm')}
                                </AppText>
                                <AppButton
                                  size="xs"
                                  data-testid={`confirm-end-one-time-match-${match.id}`}
                                  loading={ending}
                                  onClick={() => {
                                    if (
                                      !validIds ||
                                      cityId === undefined ||
                                      dayId === undefined
                                    ) {
                                      return;
                                    }
                                    setEndingMatchId(match.id);
                                    endMutation.mutate({
                                      cityId,
                                      dayId,
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
                                  data-testid={`cancel-end-one-time-match-${match.id}`}
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
                                data-testid={`end-one-time-match-${match.id}`}
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

            <Stack gap="sm" data-testid="create-one-time-match-form">
              <AppTitle order={2}>{t('create_one_time_match')}</AppTitle>
              {payload.availableElders.length === 0 ? (
                <AppText c="dimmed">{t('no_available_elders_for_day')}</AppText>
              ) : payload.matchableVolunteers.length === 0 ? (
                <AppText
                  c="dimmed"
                  data-testid="no-confirmed-volunteers-for-day"
                >
                  {t('no_confirmed_volunteers_for_day')}
                </AppText>
              ) : (
                <>
                  <NativeSelect
                    aria-label={t('select_elder')}
                    data={[
                      { value: '', label: t('select_elder') },
                      ...payload.availableElders.map((elder) => ({
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
                    data-testid="create-one-time-match-submit"
                    disabled={elderId.length === 0 || volunteerId.length === 0}
                    loading={createMutation.isPending}
                    onClick={() => {
                      if (
                        !validIds ||
                        cityId === undefined ||
                        dayId === undefined
                      ) {
                        return;
                      }
                      createMutation.mutate({
                        cityId,
                        dayId,
                        data: { elderId, volunteerId },
                      });
                    }}
                  >
                    {t('create_one_time_match')}
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
