import { NativeSelect, Stack, TextInput } from '@mantine/core';
import {
  birthDateInputValue,
  onboardingFormSchema,
  toOnboardingRequest,
  type LanguageCode,
  type OnboardingFormValues,
} from '@giving-day/shared';
import {
  AppAlert,
  AppButton,
  AppText,
  AppTitle,
  LoadingState,
} from '@giving-day/ui';
import type { TFunction } from 'i18next';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../auth/session-provider';
import {
  canPromptInstall,
  promptInstall,
  requestNotificationPermission,
  shouldShowIosInstallHelp,
} from '../auth/pwa-install';
import { useLanguage } from '../i18n/use-language';
import { AppChrome } from '../layout/app-chrome';

const VALIDATION_KEYS = ['required', 'phone_e164', 'invalid_date'] as const;

type ValidationKey = (typeof VALIDATION_KEYS)[number];
type OnboardingPhase = 'form' | 'install';

interface FormErrors {
  firstName?: string;
  lastName?: string;
  phone?: string;
  birthDate?: string;
}

function isValidationKey(value: string): value is ValidationKey {
  return (VALIDATION_KEYS as readonly string[]).includes(value);
}

function validationMessage(t: TFunction<'validation'>, key: string): string {
  return t(isValidationKey(key) ? key : 'required');
}

function inputValue(
  event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
): string {
  return event.currentTarget.value;
}

function emptyForm(locale: LanguageCode): OnboardingFormValues {
  return {
    firstName: '',
    lastName: '',
    phone: '',
    birthDate: '',
    locale,
  };
}

export function OnboardingPage(): JSX.Element {
  const { t } = useTranslation('auth');
  const { t: tCommon } = useTranslation('common');
  const { t: tValidation } = useTranslation('validation');
  const { language, setLanguage } = useLanguage();
  const { user, completeOnboarding, markReady } = useSession();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<OnboardingPhase>('form');
  const [values, setValues] = useState<OnboardingFormValues>(() =>
    emptyForm(language)
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user === null) {
      return;
    }

    setValues({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      phone: user.phone ?? '',
      birthDate: birthDateInputValue(user.birthDate),
      locale: user.locale,
    });
  }, [user]);

  const finishAndGoHome = (): void => {
    markReady();
    void navigate('/', { replace: true });
  };

  const runPostOnboardingPrompts = async (): Promise<void> => {
    await requestNotificationPermission();

    if (canPromptInstall()) {
      await promptInstall();
    }

    if (shouldShowIosInstallHelp()) {
      setPhase('install');
      return;
    }

    finishAndGoHome();
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    setSubmitError(false);

    const parsed = onboardingFormSchema.safeParse(values);
    if (!parsed.success) {
      const nextErrors: FormErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (
          typeof key === 'string' &&
          nextErrors[key as keyof FormErrors] === undefined
        ) {
          nextErrors[key as keyof FormErrors] = issue.message;
        }
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      await completeOnboarding(toOnboardingRequest(parsed.data));
      await setLanguage(parsed.data.locale);
      await runPostOnboardingPrompts();
    } catch {
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (phase === 'install') {
    return (
      <AppChrome>
        <Stack gap="lg" component="section" data-testid="install-help">
          <div>
            <AppTitle order={1}>{t('install_title')}</AppTitle>
            <AppText mt="xs">{t('install_ios_body')}</AppText>
          </div>
          <AppButton
            onClick={() => {
              finishAndGoHome();
            }}
          >
            {t('install_continue')}
          </AppButton>
        </Stack>
      </AppChrome>
    );
  }

  return (
    <AppChrome>
      <form
        noValidate
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
        data-testid="onboarding-page"
      >
        <Stack gap="lg">
          <div>
            <AppTitle order={1}>{t('onboarding_title')}</AppTitle>
            <AppText c="dimmed" mt="xs">
              {t('onboarding_subtitle')}
            </AppText>
          </div>

          {submitError ? (
            <AppAlert color="red" title={tCommon('error.unexpected_title')}>
              {t('onboarding_error')}
            </AppAlert>
          ) : null}

          <TextInput
            name="firstName"
            label={t('first_name')}
            value={values.firstName}
            onChange={(event) => {
              const firstName = inputValue(event);
              setValues((current) => ({
                ...current,
                firstName,
              }));
            }}
            error={
              errors.firstName === undefined
                ? undefined
                : validationMessage(tValidation, errors.firstName)
            }
            required
            withAsterisk
            autoComplete="given-name"
          />
          <TextInput
            name="lastName"
            label={t('last_name')}
            value={values.lastName}
            onChange={(event) => {
              const lastName = inputValue(event);
              setValues((current) => ({
                ...current,
                lastName,
              }));
            }}
            error={
              errors.lastName === undefined
                ? undefined
                : validationMessage(tValidation, errors.lastName)
            }
            required
            withAsterisk
            autoComplete="family-name"
          />
          <TextInput
            name="phone"
            label={t('phone')}
            description={t('phone_hint')}
            value={values.phone}
            onChange={(event) => {
              const phone = inputValue(event);
              setValues((current) => ({
                ...current,
                phone,
              }));
            }}
            error={
              errors.phone === undefined
                ? undefined
                : validationMessage(tValidation, errors.phone)
            }
            required
            withAsterisk
            autoComplete="tel"
            inputMode="tel"
          />
          <TextInput
            name="birthDate"
            type="date"
            label={t('birth_date')}
            description={t('birth_date_optional')}
            value={values.birthDate ?? ''}
            onChange={(event) => {
              const birthDate = inputValue(event);
              setValues((current) => ({
                ...current,
                birthDate,
              }));
            }}
            error={
              errors.birthDate === undefined
                ? undefined
                : validationMessage(tValidation, errors.birthDate)
            }
            autoComplete="bday"
          />
          {user?.email ? (
            <TextInput
              name="email"
              type="email"
              label={t('email')}
              description={t('email_from_provider')}
              value={user.email}
              readOnly
            />
          ) : null}
          <NativeSelect
            name="locale"
            label={t('preferred_language')}
            value={values.locale}
            data={[
              { value: 'he', label: tCommon('language.he') },
              { value: 'en', label: tCommon('language.en') },
            ]}
            onChange={(event) => {
              const nextLocale = inputValue(event) === 'en' ? 'en' : 'he';
              setValues((current) => ({
                ...current,
                locale: nextLocale,
              }));
              void setLanguage(nextLocale);
            }}
          />

          <AppButton type="submit" disabled={submitting}>
            {submitting ? t('submitting') : t('submit_profile')}
          </AppButton>
          {submitting ? <LoadingState label={t('submitting')} /> : null}
        </Stack>
      </form>
    </AppChrome>
  );
}
