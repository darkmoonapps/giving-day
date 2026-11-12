import { Paper, Stack, Textarea, TextInput } from '@mantine/core';
import {
  AppAlert,
  AppButton,
  AppText,
  AppTitle,
  SEMANTIC_COLORS,
} from '@giving-day/ui';
import { useQueryClient } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getGetDistributionDayDashboardQueryKey,
  getGetDistributionDayQueryKey,
  getListDistributionDaysQueryKey,
  useUpdateDistributionDay,
  type DistributionDayDashboardDto,
} from '../api/generated/api';
import {
  dayToFormValues,
  isDayDetailsValidationKey,
  isEditableDayStatus,
  parseDayDetailsForm,
  type DayDetailsFormFieldErrors,
  type DayDetailsFormValues,
  type DayDetailsSource,
} from './day-details-form';

function validationMessage(t: TFunction<'validation'>, key: string): string {
  return t(isDayDetailsValidationKey(key) ? key : 'required');
}

function inputValue(
  event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
): string {
  return event.currentTarget.value;
}

function fieldError(
  tValidation: TFunction<'validation'>,
  errors: DayDetailsFormFieldErrors,
  key: keyof DayDetailsFormFieldErrors
): string | undefined {
  const message = errors[key];
  return message === undefined
    ? undefined
    : validationMessage(tValidation, message);
}

export function CoordinatorDayDetailsForm({
  cityId,
  dayId,
  day,
}: {
  cityId: string;
  dayId: string;
  day: DayDetailsSource;
}): JSX.Element {
  const { t } = useTranslation('admin');
  const { t: tValidation } = useTranslation('validation');
  const queryClient = useQueryClient();
  const [values, setValues] = useState<DayDetailsFormValues>(() =>
    dayToFormValues(day)
  );
  const [errors, setErrors] = useState<DayDetailsFormFieldErrors>({});
  const [saved, setSaved] = useState(false);
  const editable = isEditableDayStatus(day.status);

  const updateMutation = useUpdateDistributionDay({
    mutation: {
      onSuccess: (updated) => {
        queryClient.setQueryData(
          getGetDistributionDayQueryKey(cityId, dayId),
          updated
        );
        queryClient.setQueryData(
          getGetDistributionDayDashboardQueryKey(cityId, dayId),
          (current: DistributionDayDashboardDto | undefined) =>
            current === undefined
              ? current
              : {
                  ...current,
                  startTime: updated.startTime,
                  endTime: updated.endTime,
                }
        );
        void queryClient.invalidateQueries({
          queryKey: getListDistributionDaysQueryKey(cityId),
        });
        setValues(dayToFormValues(updated));
        setErrors({});
        setSaved(true);
      },
    },
  });

  const updateField = <K extends keyof DayDetailsFormValues>(
    key: K,
    value: DayDetailsFormValues[K]
  ): void => {
    setSaved(false);
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setSaved(false);
    const parsed = parseDayDetailsForm(values);
    if (!parsed.success) {
      setErrors(parsed.errors);
      return;
    }

    setErrors({});
    updateMutation.mutate({
      cityId,
      dayId,
      data: parsed.data,
    });
  };

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <AppTitle order={2}>{t('day_details_title')}</AppTitle>
        <AppText c="dimmed">{t('day_details_subtitle')}</AppText>
        {!editable ? (
          <AppAlert data-testid="day-details-closed">
            {t('day_details_closed')}
          </AppAlert>
        ) : (
          <form
            noValidate
            onSubmit={handleSubmit}
            data-testid="day-details-form"
          >
            <Stack gap="sm">
              {saved ? (
                <AppAlert
                  color={SEMANTIC_COLORS.success}
                  data-testid="day-details-success"
                >
                  {t('day_details_save_success')}
                </AppAlert>
              ) : null}
              {updateMutation.isError ? (
                <AppAlert color="red" data-testid="day-details-save-error">
                  {t('day_details_save_error')}
                </AppAlert>
              ) : null}
              <TextInput
                name="startTime"
                type="time"
                label={t('day_start_time')}
                value={values.startTime}
                onChange={(event) => {
                  updateField('startTime', inputValue(event));
                }}
                error={fieldError(tValidation, errors, 'startTime')}
                required
                withAsterisk
                data-testid="day-details-start-time"
              />
              <TextInput
                name="endTime"
                type="time"
                label={t('day_end_time')}
                value={values.endTime}
                onChange={(event) => {
                  updateField('endTime', inputValue(event));
                }}
                error={fieldError(tValidation, errors, 'endTime')}
                required
                withAsterisk
                data-testid="day-details-end-time"
              />
              <Textarea
                name="notesForVolunteers"
                label={t('notes_for_volunteers')}
                placeholder={t('notes_for_volunteers_placeholder')}
                value={values.notesForVolunteers}
                onChange={(event) => {
                  updateField('notesForVolunteers', inputValue(event));
                }}
                error={fieldError(tValidation, errors, 'notesForVolunteers')}
                minRows={3}
                data-testid="day-details-notes"
              />
              <AppButton
                type="submit"
                loading={updateMutation.isPending}
                data-testid="save-day-details"
              >
                {updateMutation.isPending
                  ? t('day_details_saving')
                  : t('day_details_save')}
              </AppButton>
            </Stack>
          </form>
        )}
      </Stack>
    </Paper>
  );
}
