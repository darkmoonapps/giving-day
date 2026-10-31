import { NativeSelect, Paper, Stack, TextInput } from '@mantine/core';
import { canManageCitySettings } from '@giving-day/shared';
import {
  AppAlert,
  AppButton,
  AppText,
  AppTitle,
  LoadingState,
  SEMANTIC_COLORS,
} from '@giving-day/ui';
import type { TFunction } from 'i18next';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useGetCitySettings,
  useUpdateCitySettings,
} from '../api/generated/api';
import { useSession } from '../auth/session-provider';
import {
  isCitySettingsValidationKey,
  parseCitySettingsForm,
  settingsToFormValues,
  themeSelectValues,
  type CitySettingsFormFieldErrors,
  type CitySettingsFormValues,
} from '../cities/city-settings-form';
import { isUuid } from '../distribution-days/format-day';
import { AppChrome } from '../layout/app-chrome';
import { CityJoinLinksSection } from './city-join-links-section';

function validationMessage(t: TFunction<'validation'>, key: string): string {
  return t(isCitySettingsValidationKey(key) ? key : 'required');
}

function inputValue(
  event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
): string {
  return event.currentTarget.value;
}

function fieldError(
  tValidation: TFunction<'validation'>,
  errors: CitySettingsFormFieldErrors,
  key: keyof CitySettingsFormFieldErrors
): string | undefined {
  const message = errors[key];
  return message === undefined
    ? undefined
    : validationMessage(tValidation, message);
}

export function CitySettingsPage(): JSX.Element {
  const { cityId } = useParams();
  const navigate = useNavigate();
  const { user } = useSession();
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation('common');
  const { t: tValidation } = useTranslation('validation');
  const validId = isUuid(cityId);
  const allowed =
    validId && user !== null && canManageCitySettings(user, cityId ?? '');

  const [values, setValues] = useState<CitySettingsFormValues | null>(null);
  const [errors, setErrors] = useState<CitySettingsFormFieldErrors>({});
  const [saved, setSaved] = useState(false);

  const settingsQuery = useGetCitySettings(cityId ?? '', {
    query: { enabled: allowed },
  });
  const updateMutation = useUpdateCitySettings({
    mutation: {
      onSuccess: (settings) => {
        setValues(settingsToFormValues(settings));
        setErrors({});
        setSaved(true);
      },
    },
  });

  useEffect(() => {
    if (settingsQuery.data === undefined) {
      return;
    }
    setValues(settingsToFormValues(settingsQuery.data));
    setErrors({});
    setSaved(false);
  }, [settingsQuery.data]);

  const loading = settingsQuery.isLoading || values === null;

  const updateField = <K extends keyof CitySettingsFormValues>(
    key: K,
    value: CitySettingsFormValues[K]
  ): void => {
    setSaved(false);
    setValues((current) =>
      current === null
        ? current
        : {
            ...current,
            [key]: value,
          }
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (values === null || !validId) {
      return;
    }

    setSaved(false);
    const parsed = parseCitySettingsForm(values);
    if (!parsed.success) {
      setErrors(parsed.errors);
      return;
    }

    setErrors({});
    updateMutation.mutate({
      cityId,
      data: parsed.data,
    });
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
      <Stack gap="lg" component="section" data-testid="city-settings-page">
        {!allowed ? (
          <AppAlert color="red" title={tCommon('error.unexpected_title')}>
            {t('settings_load_error')}
          </AppAlert>
        ) : (
          <>
            <div>
              <AppTitle order={1}>{t('settings_title')}</AppTitle>
              <AppText c="dimmed" mt="sm">
                {t('settings_subtitle')}
              </AppText>
            </div>
            {cityId !== undefined ? (
              <CityJoinLinksSection cityId={cityId} />
            ) : null}
            {settingsQuery.isError ? (
              <AppAlert color="red" title={tCommon('error.unexpected_title')}>
                {t('settings_load_error')}
              </AppAlert>
            ) : loading ? (
              <LoadingState label={tCommon('loading')} />
            ) : (
              <form
                noValidate
                onSubmit={handleSubmit}
                data-testid="city-settings-form"
              >
                <Stack gap="lg">
                  {saved ? (
                    <AppAlert
                      color={SEMANTIC_COLORS.success}
                      data-testid="city-settings-success"
                    >
                      {t('settings_save_success')}
                    </AppAlert>
                  ) : null}
                  {updateMutation.isError ? (
                    <AppAlert
                      color="red"
                      data-testid="city-settings-save-error"
                    >
                      {t('settings_save_error')}
                    </AppAlert>
                  ) : null}

                  <Paper withBorder p="md" radius="md">
                    <Stack gap="sm">
                      <AppTitle order={2}>
                        {t('settings_section_center')}
                      </AppTitle>
                      <TextInput
                        name="centerAddress"
                        label={t('center_address')}
                        description={t('center_address_hint')}
                        value={values.centerAddress}
                        onChange={(event) => {
                          updateField('centerAddress', inputValue(event));
                        }}
                        error={fieldError(tValidation, errors, 'centerAddress')}
                        required
                        withAsterisk
                      />
                      <TextInput
                        name="centerLat"
                        label={t('center_lat')}
                        value={values.centerLat}
                        onChange={(event) => {
                          updateField('centerLat', inputValue(event));
                        }}
                        error={fieldError(tValidation, errors, 'centerLat')}
                        inputMode="decimal"
                        required
                        withAsterisk
                      />
                      <TextInput
                        name="centerLng"
                        label={t('center_lng')}
                        value={values.centerLng}
                        onChange={(event) => {
                          updateField('centerLng', inputValue(event));
                        }}
                        error={fieldError(tValidation, errors, 'centerLng')}
                        inputMode="decimal"
                        required
                        withAsterisk
                      />
                    </Stack>
                  </Paper>

                  <Paper withBorder p="md" radius="md">
                    <Stack gap="sm">
                      <AppTitle order={2}>
                        {t('settings_section_hours')}
                      </AppTitle>
                      <TextInput
                        name="defaultStartTime"
                        type="time"
                        label={t('default_start_time')}
                        value={values.defaultStartTime}
                        onChange={(event) => {
                          updateField('defaultStartTime', inputValue(event));
                        }}
                        error={fieldError(
                          tValidation,
                          errors,
                          'defaultStartTime'
                        )}
                        required
                        withAsterisk
                      />
                      <TextInput
                        name="defaultEndTime"
                        type="time"
                        label={t('default_end_time')}
                        value={values.defaultEndTime}
                        onChange={(event) => {
                          updateField('defaultEndTime', inputValue(event));
                        }}
                        error={fieldError(
                          tValidation,
                          errors,
                          'defaultEndTime'
                        )}
                        required
                        withAsterisk
                      />
                    </Stack>
                  </Paper>

                  <Paper withBorder p="md" radius="md">
                    <Stack gap="sm">
                      <AppTitle order={2}>
                        {t('settings_section_notifications')}
                      </AppTitle>
                      <TextInput
                        name="confirmReminderAfterHours"
                        label={t('confirm_reminder_after_hours')}
                        description={t('confirm_reminder_after_hours_hint')}
                        value={values.confirmReminderAfterHours}
                        onChange={(event) => {
                          updateField(
                            'confirmReminderAfterHours',
                            inputValue(event)
                          );
                        }}
                        error={fieldError(
                          tValidation,
                          errors,
                          'confirmReminderAfterHours'
                        )}
                        inputMode="numeric"
                        required
                        withAsterisk
                      />
                      <TextInput
                        name="unpickedPushMinutesBeforeEnd"
                        label={t('unpicked_push_minutes')}
                        description={t('unpicked_push_minutes_hint')}
                        value={values.unpickedPushMinutesBeforeEnd}
                        onChange={(event) => {
                          updateField(
                            'unpickedPushMinutesBeforeEnd',
                            inputValue(event)
                          );
                        }}
                        error={fieldError(
                          tValidation,
                          errors,
                          'unpickedPushMinutesBeforeEnd'
                        )}
                        inputMode="numeric"
                        required
                        withAsterisk
                      />
                      <TextInput
                        name="missingFinalStatusWaitHours"
                        label={t('missing_final_status_wait_hours')}
                        description={t('missing_final_status_wait_hours_hint')}
                        value={values.missingFinalStatusWaitHours}
                        onChange={(event) => {
                          updateField(
                            'missingFinalStatusWaitHours',
                            inputValue(event)
                          );
                        }}
                        error={fieldError(
                          tValidation,
                          errors,
                          'missingFinalStatusWaitHours'
                        )}
                        inputMode="numeric"
                        required
                        withAsterisk
                      />
                    </Stack>
                  </Paper>

                  <Paper withBorder p="md" radius="md">
                    <Stack gap="sm">
                      <AppTitle order={2}>
                        {t('settings_section_organization')}
                      </AppTitle>
                      <TextInput
                        name="orgName"
                        label={t('org_name')}
                        value={values.orgName}
                        onChange={(event) => {
                          updateField('orgName', inputValue(event));
                        }}
                        error={fieldError(tValidation, errors, 'orgName')}
                      />
                      <TextInput
                        name="logoUrl"
                        label={t('logo_url')}
                        description={t('logo_url_hint')}
                        value={values.logoUrl}
                        onChange={(event) => {
                          updateField('logoUrl', inputValue(event));
                        }}
                        error={fieldError(tValidation, errors, 'logoUrl')}
                        inputMode="url"
                      />
                      <NativeSelect
                        name="defaultLocale"
                        label={t('default_locale')}
                        value={values.defaultLocale}
                        data={[
                          { value: 'he', label: tCommon('language.he') },
                          { value: 'en', label: tCommon('language.en') },
                        ]}
                        onChange={(event) => {
                          updateField(
                            'defaultLocale',
                            inputValue(event) === 'en' ? 'en' : 'he'
                          );
                        }}
                      />
                      <NativeSelect
                        name="defaultTheme"
                        label={t('default_theme')}
                        value={values.defaultTheme}
                        data={themeSelectValues(values.defaultTheme).map(
                          (theme) => ({
                            value: theme,
                            label:
                              theme === 'wisteria-mint'
                                ? t('theme_wisteria_mint')
                                : theme,
                          })
                        )}
                        onChange={(event) => {
                          updateField('defaultTheme', inputValue(event));
                        }}
                      />
                    </Stack>
                  </Paper>

                  <AppButton
                    type="submit"
                    data-testid="save-city-settings"
                    loading={updateMutation.isPending}
                  >
                    {updateMutation.isPending
                      ? t('settings_saving')
                      : t('settings_save')}
                  </AppButton>
                </Stack>
              </form>
            )}
          </>
        )}
      </Stack>
    </AppChrome>
  );
}
