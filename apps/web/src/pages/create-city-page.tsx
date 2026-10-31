import { Paper, Stack, TextInput } from '@mantine/core';
import { isSuperAdmin } from '@giving-day/shared';
import { AppAlert, AppButton, AppText, AppTitle } from '@giving-day/ui';
import type { TFunction } from 'i18next';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useCreateCity } from '../api/generated/api';
import { ApiError } from '../api/mutator';
import { useSession } from '../auth/session-provider';
import {
  emptyCreateCityFormValues,
  isCreateCityValidationKey,
  parseCreateCityForm,
  type CreateCityFormFieldErrors,
  type CreateCityFormValues,
} from '../cities/create-city-form';
import { AppChrome } from '../layout/app-chrome';

function validationMessage(t: TFunction<'validation'>, key: string): string {
  return t(isCreateCityValidationKey(key) ? key : 'required');
}

function inputValue(event: ChangeEvent<HTMLInputElement>): string {
  return event.currentTarget.value;
}

function fieldError(
  tValidation: TFunction<'validation'>,
  errors: CreateCityFormFieldErrors,
  key: keyof CreateCityFormFieldErrors
): string | undefined {
  const message = errors[key];
  return message === undefined
    ? undefined
    : validationMessage(tValidation, message);
}

function createCityErrorMessage(error: unknown, t: TFunction<'admin'>): string {
  if (error instanceof ApiError && error.code === 'cities.duplicate_slug') {
    return t('create_city_duplicate_slug');
  }
  return t('create_city_error');
}

export function CreateCityPage(): JSX.Element {
  const navigate = useNavigate();
  const { user } = useSession();
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation('common');
  const { t: tValidation } = useTranslation('validation');
  const allowed = user !== null && isSuperAdmin(user);

  const [values, setValues] = useState<CreateCityFormValues>(
    emptyCreateCityFormValues
  );
  const [errors, setErrors] = useState<CreateCityFormFieldErrors>({});

  const createMutation = useCreateCity({
    mutation: {
      onSuccess: (city) => {
        void navigate(`/cities/${city.id}/settings`, { replace: true });
      },
    },
  });

  const updateField = <K extends keyof CreateCityFormValues>(
    key: K,
    value: CreateCityFormValues[K]
  ): void => {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!allowed) {
      return;
    }

    const parsed = parseCreateCityForm(values);
    if (!parsed.success) {
      setErrors(parsed.errors);
      return;
    }

    setErrors({});
    createMutation.mutate({ data: parsed.data });
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
      <Stack gap="lg" component="section" data-testid="create-city-page">
        {!allowed ? (
          <AppAlert color="red" title={tCommon('error.unexpected_title')}>
            {t('create_city_no_access')}
          </AppAlert>
        ) : (
          <>
            <div>
              <AppTitle order={1}>{t('create_city_title')}</AppTitle>
              <AppText c="dimmed" mt="sm">
                {t('create_city_subtitle')}
              </AppText>
            </div>
            <form
              noValidate
              onSubmit={handleSubmit}
              data-testid="create-city-form"
            >
              <Stack gap="lg">
                {createMutation.isError ? (
                  <AppAlert color="red" data-testid="create-city-error">
                    {createCityErrorMessage(createMutation.error, t)}
                  </AppAlert>
                ) : null}
                <Paper withBorder p="md" radius="md">
                  <Stack gap="sm">
                    <TextInput
                      name="nameHe"
                      label={t('create_city_name_he')}
                      value={values.nameHe}
                      onChange={(event) => {
                        updateField('nameHe', inputValue(event));
                      }}
                      error={fieldError(tValidation, errors, 'nameHe')}
                      required
                      withAsterisk
                    />
                    <TextInput
                      name="nameEn"
                      label={t('create_city_name_en')}
                      value={values.nameEn}
                      onChange={(event) => {
                        updateField('nameEn', inputValue(event));
                      }}
                      error={fieldError(tValidation, errors, 'nameEn')}
                      required
                      withAsterisk
                    />
                    <TextInput
                      name="slug"
                      label={t('create_city_slug')}
                      description={t('create_city_slug_hint')}
                      value={values.slug}
                      onChange={(event) => {
                        updateField('slug', inputValue(event));
                      }}
                      error={fieldError(tValidation, errors, 'slug')}
                      required
                      withAsterisk
                    />
                  </Stack>
                </Paper>
                <AppButton
                  type="submit"
                  data-testid="create-city-submit"
                  loading={createMutation.isPending}
                >
                  {createMutation.isPending
                    ? t('create_city_submitting')
                    : t('create_city_submit')}
                </AppButton>
              </Stack>
            </form>
          </>
        )}
      </Stack>
    </AppChrome>
  );
}
