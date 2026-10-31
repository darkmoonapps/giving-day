import { LoadingState } from '@giving-day/ui';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { useSession } from '../auth/session-provider';
import { postAuthPath } from '../join/join-token-storage';
import { AppChrome } from '../layout/app-chrome';

function SessionLoading(): JSX.Element {
  const { t } = useTranslation('common');
  return (
    <AppChrome>
      <LoadingState label={t('loading')} />
    </AppChrome>
  );
}

export function GuestRoute({ children }: { children: ReactNode }): JSX.Element {
  const { status } = useSession();

  if (status === 'loading') {
    return <SessionLoading />;
  }

  if (status === 'needs_onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  if (status === 'ready') {
    return <Navigate to={postAuthPath()} replace />;
  }

  return <>{children}</>;
}

export function OnboardingRoute({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const { status } = useSession();

  if (status === 'loading') {
    return <SessionLoading />;
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace />;
  }

  if (status === 'ready') {
    return <Navigate to={postAuthPath()} replace />;
  }

  return <>{children}</>;
}

export function ProtectedRoute({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const { status } = useSession();

  if (status === 'loading') {
    return <SessionLoading />;
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace />;
  }

  if (status === 'needs_onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
