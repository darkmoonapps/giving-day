import { LoadingState } from '@giving-day/ui';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSession } from '../auth/session-provider';
import { postAuthPath } from '../join/join-token-storage';
import { AppChrome } from '../layout/app-chrome';

export function OAuthCallbackPage(): JSX.Element {
  const { t } = useTranslation('auth');
  const { status } = useSession();

  if (status === 'ready') {
    return <Navigate to={postAuthPath()} replace />;
  }

  if (status === 'needs_onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppChrome>
      <LoadingState label={t('callback_loading')} />
    </AppChrome>
  );
}
