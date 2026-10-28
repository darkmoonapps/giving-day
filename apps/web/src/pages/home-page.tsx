import { Stack } from '@mantine/core';
import { getUserDisplayName } from '@giving-day/shared';
import { AppButton, AppText, AppTitle } from '@giving-day/ui';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../auth/session-provider';
import { AppChrome } from '../layout/app-chrome';

export function HomePage(): JSX.Element {
  const { t } = useTranslation('auth');
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const displayName = user === null ? '' : getUserDisplayName(user);

  return (
    <AppChrome
      actions={
        <AppButton
          size="xs"
          variant="light"
          onClick={() => {
            void logout().then(() => {
              void navigate('/login', { replace: true });
            });
          }}
        >
          {t('logout')}
        </AppButton>
      }
    >
      <Stack gap="lg" component="section" data-testid="home-page">
        <div>
          <AppTitle order={1}>{t('home_title')}</AppTitle>
          {displayName.length > 0 ? (
            <AppText mt="xs">
              {t('home_greeting', { name: displayName })}
            </AppText>
          ) : null}
          <AppText c="dimmed" mt="sm">
            {t('home_empty')}
          </AppText>
        </div>
      </Stack>
    </AppChrome>
  );
}
