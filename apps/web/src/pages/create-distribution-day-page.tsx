import { Paper, Stack, Textarea, TextInput } from '@mantine/core';
import {
  canManageCitySettings,
  type OpenDistributionDay,
} from '@giving-day/shared';
import {
  AppAlert,
  AppButton,
  AppText,
  AppTitle,
  LoadingState,
} from '@giving-day/ui';
import { useQueryClient } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getListDistributionDaysQueryKey,
  useGetCitySettings,
  useOpenDistributionDay,
} from '../api/generated/api';
import { ApiError } from '../api/mutator';
import { useSession } from '../auth/session-provider';
import { toTimeInputValue } from '../cities/city-settings-form';
import {
  emptyCreateDayFormValues,
  isCreateDayValidationKey,
  parseCreateDayForm,
  type CreateDayFormFieldErrors,
  type CreateDayFormValues,
} from '../distribution-days/create-day-form';
import {
  formatDayHours,
  formatDistributionDate,
  isUuid,
} from '../distribution-days/format-day';
import { useLanguage } from '../i18n/use-language';
import { AppChrome } from '../layout/app-chrome';

type CreateDayStep = 'form' | 'review';

function validationMessage(t: TFunction<'validation'>, key: string): string {
  return t(isCreateDayValidationKey(key) ? key : 'required');
}

function inputValue(
  event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
): string {
  return event.currentTarget.value;
}

function fieldError(
  tValidation: TFunction<'validation'>,
  errors: CreateDayFormFieldErrors,
  key: keyof CreateDayFormFieldErrors
): string | undefined {
  const message = errors[key];
  return message === undefined
    ? undefined
    : validationMessage(tValidation, message);
}

function createDayErrorMessage(error: unknown, t: TFunction<'admin'>): string {
  if (
    error instanceof ApiError &&
    error.code === 'distribution_days.duplicate_date'
  ) {
    return t('create_day_duplicate');
  }
  return t('create_day_error');
}

function reviewValue(value: string | null | undefined, empty: string): string {
  if (value === undefined || value === null) {
    return empty;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? empty : trimmed;
}

export function CreateDistributionDayPage(): JSX.Element {
  const { cityId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  const { user } = useSession();
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation('common');
  const { t: tValidation } = useTranslation('validation');
  const validId = isUuid(cityId);
  const allowed =
    validId && user !== null && canManageCitySettings(user, cityId ?? '');

  const [step, setStep] = useState<CreateDayStep>('form');
  const [values, setValues] = useState<CreateDayFormValues>(
    emptyCreateDayFormValues()
  );
  const [errors, setErrors] = useState<CreateDayFormFieldErrors>({});
  const [reviewPayload, setReviewPayload] =
    useState<OpenDistributionDay | null>(null);
  const hoursApplied = useRef(false);

  const settingsQuery = useGetCitySettings(cityId ?? '', {
    query: { enabled: allowed },
  });

  useEffect(() => {
    if (settingsQuery.data === undefined || hoursApplied.current) {
      return;
    }
    hoursApplied.current = true;
    setValues(
      emptyCreateDayFormValues({
        startTime: settingsQuery.data.defaultStartTime,
        endTime: settingsQuery.data.defaultEndTime,
      })
    );
  }, [settingsQuery.data]);

  const openMutation = useOpenDistributionDay({
    mutation: {
      onSuccess: async () => {
        if (!validId) {
          return;
        }
        await queryClient.invalidateQueries({
          queryKey: getListDistributionDaysQueryKey(cityId),
        });
        void navigate('/', { replace: true });
      },
    },
  });

  const updateField = <K extends keyof CreateDayFormValues>(
    key: K,
    value: CreateDayFormValues[K]
  ): void => {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleContinue = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!allowed) {
      return;
    }

    const parsed = parseCreateDayForm(values);
    if (!parsed.success) {
      setErrors(parsed.errors);
      return;
    }

    setErrors({});
    setReviewPayload(parsed.data);
    setStep('review');
  };

  const handlePublish = (): void => {
    if (!validId || reviewPayload === null) {
      return;
    }
    openMutation.mutate({
      cityId,
      data: reviewPayload,
    });
  };

  const centerAddress = settingsQuery.data?.centerAddress ?? '';
  const loading = settingsQuery.isLoading && settingsQuery.data === undefined;

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
      <Stack gap="lg" component="section" data-testid="create-day-page">
        {!allowed ? (
          <AppAlert color="red" title={tCommon('error.unexpected_title')}>
            {t('create_day_no_access')}
          </AppAlert>
        ) : settingsQuery.isError ? (
          <AppAlert color="red" title={tCommon('error.unexpected_title')}>
            {t('create_day_settings_error')}
          </AppAlert>
        ) : loading ? (
          <LoadingState label={tCommon('loading')} />
        ) : step === 'review' && reviewPayload !== null ? (
          <>
            <div>
              <AppTitle order={1}>{t('create_day_review_title')}</AppTitle>
              <AppText c="dimmed" mt="sm">
                {t('create_day_review_subtitle')}
              </AppText>
            </div>
            {openMutation.isError ? (
              <AppAlert color="red" data-testid="create-day-error">
                {createDayErrorMessage(openMutation.error, t)}
              </AppAlert>
            ) : null}
            <Paper
              withBorder
              p="md"
              radius="md"
              data-testid="create-day-review"
            >
              <Stack gap="sm">
                <div>
                  <AppText size="sm" c="dimmed">
                    {t('create_day_date')}
                  </AppText>
                  <AppText data-testid="create-day-review-date" fw={600}>
                    {formatDistributionDate(reviewPayload.date, language)}
                  </AppText>
                </div>
                <div>
                  <AppText size="sm" c="dimmed">
                    {t('create_day_hours')}
                  </AppText>
                  <AppText data-testid="create-day-review-hours">
                    {formatDayHours(
                      reviewPayload.startTime ?? values.startTime,
                      reviewPayload.endTime ?? values.endTime
                    )}
                  </AppText>
                </div>
                <div>
                  <AppText size="sm" c="dimmed">
                    {t('create_day_center')}
                  </AppText>
                  <AppText data-testid="create-day-review-center">
                    {reviewValue(centerAddress, t('create_day_none'))}
                  </AppText>
                </div>
                <div>
                  <AppText size="sm" c="dimmed">
                    {t('create_day_notes')}
                  </AppText>
                  <AppText>
                    {reviewValue(
                      reviewPayload.notesForVolunteers,
                      t('create_day_none')
                    )}
                  </AppText>
                </div>
                <div>
                  <AppText size="sm" c="dimmed">
                    {t('create_day_internal_notes')}
                  </AppText>
                  <AppText>
                    {reviewValue(
                      reviewPayload.internalNotes,
                      t('create_day_none')
                    )}
                  </AppText>
                </div>
                <div>
                  <AppText size="sm" c="dimmed">
                    {t('create_day_add_ons')}
                  </AppText>
                  <AppText>
                    {reviewPayload.addOns === undefined ||
                    reviewPayload.addOns.length === 0
                      ? t('create_day_none')
                      : reviewPayload.addOns.join(', ')}
                  </AppText>
                </div>
                <AppText size="sm" c="dimmed">
                  {t('create_day_push_note')}
                </AppText>
              </Stack>
            </Paper>
            <Stack gap="sm">
              <AppButton
                data-testid="create-day-publish"
                onClick={handlePublish}
                loading={openMutation.isPending}
              >
                {openMutation.isPending
                  ? t('create_day_publishing')
                  : t('create_day_publish')}
              </AppButton>
              <AppButton
                variant="light"
                data-testid="create-day-back"
                disabled={openMutation.isPending}
                onClick={() => {
                  setStep('form');
                }}
              >
                {t('create_day_back_to_form')}
              </AppButton>
            </Stack>
          </>
        ) : (
          <>
            <div>
              <AppTitle order={1}>{t('create_day_title')}</AppTitle>
              <AppText c="dimmed" mt="sm">
                {t('create_day_subtitle')}
              </AppText>
            </div>
            <form
              noValidate
              onSubmit={handleContinue}
              data-testid="create-day-form"
            >
              <Stack gap="lg">
                <Paper withBorder p="md" radius="md">
                  <Stack gap="sm">
                    <TextInput
                      name="date"
                      type="date"
                      label={t('create_day_date')}
                      value={values.date}
                      onChange={(event) => {
                        updateField('date', inputValue(event));
                      }}
                      error={fieldError(tValidation, errors, 'date')}
                      required
                      withAsterisk
                    />
                    <TextInput
                      name="startTime"
                      type="time"
                      label={t('create_day_start_time')}
                      description={t('create_day_hours_hint')}
                      value={values.startTime}
                      onChange={(event) => {
                        updateField(
                          'startTime',
                          toTimeInputValue(inputValue(event))
                        );
                      }}
                      error={fieldError(tValidation, errors, 'startTime')}
                      required
                      withAsterisk
                    />
                    <TextInput
                      name="endTime"
                      type="time"
                      label={t('create_day_end_time')}
                      value={values.endTime}
                      onChange={(event) => {
                        updateField(
                          'endTime',
                          toTimeInputValue(inputValue(event))
                        );
                      }}
                      error={fieldError(tValidation, errors, 'endTime')}
                      required
                      withAsterisk
                    />
                    <TextInput
                      name="centerAddress"
                      label={t('create_day_center')}
                      description={t('create_day_center_hint')}
                      value={centerAddress}
                      readOnly
                      data-testid="create-day-center"
                    />
                    <Textarea
                      name="notesForVolunteers"
                      label={t('create_day_notes')}
                      description={t('create_day_notes_hint')}
                      value={values.notesForVolunteers}
                      onChange={(event) => {
                        updateField('notesForVolunteers', inputValue(event));
                      }}
                      error={fieldError(
                        tValidation,
                        errors,
                        'notesForVolunteers'
                      )}
                      minRows={2}
                      maxLength={4000}
                    />
                    <Textarea
                      name="internalNotes"
                      label={t('create_day_internal_notes')}
                      description={t('create_day_internal_notes_hint')}
                      value={values.internalNotes}
                      onChange={(event) => {
                        updateField('internalNotes', inputValue(event));
                      }}
                      error={fieldError(tValidation, errors, 'internalNotes')}
                      minRows={2}
                      maxLength={4000}
                    />
                    <TextInput
                      name="addOns"
                      label={t('create_day_add_ons')}
                      description={t('create_day_add_ons_hint')}
                      value={values.addOns}
                      onChange={(event) => {
                        updateField('addOns', inputValue(event));
                      }}
                      error={fieldError(tValidation, errors, 'addOns')}
                    />
                  </Stack>
                </Paper>
                <AppButton type="submit" data-testid="create-day-continue">
                  {t('create_day_continue')}
                </AppButton>
              </Stack>
            </form>
          </>
        )}
      </Stack>
    </AppChrome>
  );
}
