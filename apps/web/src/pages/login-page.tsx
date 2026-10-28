import { Stack } from '@mantine/core';
import {
  AppAlert,
  AppButton,
  AppText,
  AppTitle,
  LoadingState,
} from '@giving-day/ui';
import { IconBrandFacebook, IconBrandGoogle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { startOAuthLogin } from '../auth/oauth';
import { useSession } from '../auth/session-provider';
import { AppChrome } from '../layout/app-chrome';

export function LoginPage(): JSX.Element {
  const { t } = useTranslation('auth');
  const { t: tCommon } = useTranslation('common');
  const { status, error } = useSession();

  return (
    <AppChrome>
      {status === 'loading' ? (
        <LoadingState label={tCommon('loading')} />
      ) : (
        <Stack gap="lg" component="section" data-testid="login-page">
          <div>
            <AppTitle order={1}>{t('login_title')}</AppTitle>
            <AppText c="dimmed" mt="xs">
              {t('login_subtitle')}
            </AppText>
          </div>

          {error === 'session_error' ? (
            <AppAlert color="red" title={tCommon('error.unexpected_title')}>
              {t('session_error')}
            </AppAlert>
          ) : null}

          <Stack gap="sm">
            <AppButton
              size="md"
              fullWidth
              leftSection={<IconBrandGoogle size={18} aria-hidden />}
              onClick={() => {
                startOAuthLogin('google');
              }}
            >
              {t('continue_with_google')}
            </AppButton>
            <AppButton
              size="md"
              fullWidth
              variant="light"
              leftSection={<IconBrandFacebook size={18} aria-hidden />}
              onClick={() => {
                startOAuthLogin('facebook');
              }}
            >
              {t('continue_with_facebook')}
            </AppButton>
          </Stack>
        </Stack>
      )}
    </AppChrome>
  );
}
