import { Stack, Textarea } from '@mantine/core';
import { respondToDistributionDaySchema } from '@giving-day/shared';
import {
  AppAlert,
  AppButton,
  AppText,
  AppTitle,
  LoadingState,
} from '@giving-day/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useGetDistributionDay,
  useRespondToDistributionDay,
} from '../api/generated/api';
import {
  formatDayHours,
  formatDistributionDate,
  isUuid,
} from '../distribution-days/format-day';
import { useLanguage } from '../i18n/use-language';
import { AppChrome } from '../layout/app-chrome';

type VolunteerView = 'choose' | 'decline' | 'confirmed' | 'declined' | 'closed';

function viewFromParticipation(
  status: string | undefined,
  participation: { status: string } | null | undefined
): VolunteerView {
  if (status !== 'published' && status !== 'in_progress') {
    return 'closed';
  }
  if (participation?.status === 'confirmed') {
    return 'confirmed';
  }
  if (participation?.status === 'declined') {
    return 'declined';
  }
  return 'choose';
}

export function VolunteerDayPage(): JSX.Element {
  const { cityId, dayId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { t } = useTranslation('volunteer');
  const { t: tCommon } = useTranslation('common');
  const { t: tValidation } = useTranslation('validation');
  const validIds = isUuid(cityId) && isUuid(dayId);
  const [viewOverride, setViewOverride] = useState<VolunteerView | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [respondError, setRespondError] = useState(false);

  const dayQuery = useGetDistributionDay(cityId ?? '', dayId ?? '', {
    query: { enabled: validIds },
  });
  const respondMutation = useRespondToDistributionDay({
    mutation: {
      onSuccess: async () => {
        setRespondError(false);
        await dayQuery.refetch();
      },
      onError: () => {
        setRespondError(true);
      },
    },
  });

  const day = dayQuery.data;
  const participation = day?.myParticipation ?? null;
  const view =
    viewOverride ?? viewFromParticipation(day?.status, participation);
  const submitting = respondMutation.isPending;

  const confirm = (): void => {
    if (cityId === undefined || dayId === undefined) {
      return;
    }
    setRespondError(false);
    respondMutation.mutate(
      { cityId, dayId, data: { status: 'confirmed' } },
      {
        onSuccess: () => {
          setViewOverride('confirmed');
        },
      }
    );
  };

  const decline = (): void => {
    if (cityId === undefined || dayId === undefined) {
      return;
    }
    const parsed = respondToDistributionDaySchema.safeParse({
      status: 'declined',
      cancelReason: reason,
    });
    if (!parsed.success) {
      setReasonError(tValidation('required'));
      return;
    }
    setReasonError(null);
    setRespondError(false);
    respondMutation.mutate(
      { cityId, dayId, data: parsed.data },
      {
        onSuccess: () => {
          setViewOverride('declined');
        },
      }
    );
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
      <Stack gap="lg" component="section" data-testid="volunteer-day-page">
        {!validIds || dayQuery.isError ? (
          <AppAlert color="red" title={tCommon('error.unexpected_title')}>
            {t('load_error')}
          </AppAlert>
        ) : dayQuery.isLoading || day === undefined ? (
          <LoadingState label={tCommon('loading')} />
        ) : (
          <>
            <div>
              <AppTitle order={1}>
                {formatDistributionDate(day.date, language)}
              </AppTitle>
              <AppText c="dimmed" mt="xs">
                {formatDayHours(day.startTime, day.endTime)}
              </AppText>
            </div>

            {day.notesForVolunteers !== null &&
            day.notesForVolunteers.length > 0 ? (
              <div>
                <AppText fw={600}>{t('notes_label')}</AppText>
                <AppText mt="xs">{day.notesForVolunteers}</AppText>
              </div>
            ) : null}

            {day.addOns.length > 0 ? (
              <div>
                <AppText fw={600}>{t('add_ons_label')}</AppText>
                <AppText mt="xs">{day.addOns.join(', ')}</AppText>
              </div>
            ) : null}

            {respondError ? (
              <AppAlert
                color="red"
                title={tCommon('error.unexpected_title')}
                data-testid="volunteer-respond-error"
              >
                {t('respond_error')}
              </AppAlert>
            ) : null}

            {view === 'closed' ? (
              <AppAlert color="yellow">{t('closed_title')}</AppAlert>
            ) : null}

            {view === 'confirmed' ? (
              <Stack gap="sm" data-testid="confirm-thanks">
                <AppTitle order={2}>{t('thanks_title')}</AppTitle>
                <AppText>{t('thanks_body')}</AppText>
                <AppText aria-hidden="true">🎉</AppText>
                <AppButton
                  variant="light"
                  onClick={() => {
                    setViewOverride('decline');
                  }}
                >
                  {t('decline_button')}
                </AppButton>
              </Stack>
            ) : null}

            {view === 'declined' ? (
              <Stack gap="sm" data-testid="decline-thanks">
                <AppTitle order={2}>{t('declined_title')}</AppTitle>
                <AppText>{t('declined_body')}</AppText>
                {participation?.cancelReason !== null &&
                participation?.cancelReason !== undefined &&
                participation.cancelReason.length > 0 ? (
                  <AppText>
                    {t('your_reason', { reason: participation.cancelReason })}
                  </AppText>
                ) : null}
                <AppButton
                  onClick={() => {
                    confirm();
                  }}
                  loading={submitting}
                >
                  {t('change_to_confirm')}
                </AppButton>
              </Stack>
            ) : null}

            {view === 'choose' ? (
              <Stack gap="sm">
                <AppButton
                  onClick={() => {
                    confirm();
                  }}
                  loading={submitting}
                  data-testid="confirm-participation"
                >
                  {t('confirm_button')}
                </AppButton>
                <AppButton
                  variant="light"
                  color="red"
                  onClick={() => {
                    setViewOverride('decline');
                  }}
                  data-testid="decline-participation"
                >
                  {t('decline_button')}
                </AppButton>
              </Stack>
            ) : null}

            {view === 'decline' ? (
              <Stack gap="sm" data-testid="decline-form">
                <Textarea
                  label={t('decline_reason_label')}
                  placeholder={t('decline_reason_placeholder')}
                  value={reason}
                  error={reasonError ?? undefined}
                  minRows={3}
                  onChange={(event) => {
                    setReason(event.currentTarget.value);
                    if (reasonError !== null) {
                      setReasonError(null);
                    }
                  }}
                />
                <AppButton
                  color="red"
                  onClick={() => {
                    decline();
                  }}
                  loading={submitting}
                  data-testid="submit-decline"
                >
                  {t('decline_submit')}
                </AppButton>
                <AppButton
                  variant="light"
                  onClick={() => {
                    setViewOverride(
                      participation?.status === 'confirmed'
                        ? 'confirmed'
                        : 'choose'
                    );
                  }}
                >
                  {t('decline_cancel')}
                </AppButton>
              </Stack>
            ) : null}
          </>
        )}
      </Stack>
    </AppChrome>
  );
}
