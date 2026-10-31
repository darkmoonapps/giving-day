import { Stack } from '@mantine/core';
import { IconBrandFacebook, IconBrandGoogle } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  AppAlert,
  AppButton,
  AppText,
  AppTitle,
  LoadingState,
} from '@giving-day/ui';
import type {
  JoinLinkPreview,
  RedeemJoinLinkResponse,
} from '@giving-day/shared';
import { previewCityJoinLink, redeemCityJoinLink } from '../api/generated/api';
import { ApiError } from '../api/mutator';
import { startOAuthLogin } from '../auth/oauth';
import { useSession } from '../auth/session-provider';
import { useLanguage } from '../i18n/use-language';
import {
  cityDisplayName,
  isTerminalJoinError,
  joinErrorMessage,
} from '../join/join-errors';
import { JoinInstallButton } from '../join/join-install-button';
import {
  clearPersistedJoinToken,
  isJoinTokenFormatValid,
  persistJoinToken,
} from '../join/join-token-storage';
import { AppChrome } from '../layout/app-chrome';

type RedeemState =
  | { kind: 'loading' }
  | { kind: 'result'; payload: RedeemJoinLinkResponse }
  | { kind: 'error'; error: unknown };

function JoinShell({ children }: { children: JSX.Element }): JSX.Element {
  return (
    <AppChrome>
      <Stack gap="lg" component="section" data-testid="join-page">
        {children}
      </Stack>
    </AppChrome>
  );
}

function JoinInvalidState({ message }: { message: string }): JSX.Element {
  const { t } = useTranslation('auth');

  return (
    <JoinShell>
      <AppAlert
        color="red"
        title={t('join_invalid_title')}
        data-testid="join-invalid"
      >
        {message}
      </AppAlert>
    </JoinShell>
  );
}

function JoinLanding({ preview }: { preview: JoinLinkPreview }): JSX.Element {
  const { t } = useTranslation('auth');
  const { language } = useLanguage();
  const cityName = cityDisplayName(preview, language);
  const subtitleKey =
    preview.role === 'coordinator'
      ? 'join_subtitle_coordinator'
      : 'join_subtitle_volunteer';

  return (
    <JoinShell>
      <Stack gap="lg">
        <div>
          <AppTitle order={1}>{t('join_title', { city: cityName })}</AppTitle>
          <AppText c="dimmed" mt="xs">
            {t(subtitleKey, { city: cityName })}
          </AppText>
        </div>
        <JoinInstallButton />
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
    </JoinShell>
  );
}

function JoinRedeemedState({
  payload,
}: {
  payload: RedeemJoinLinkResponse;
}): JSX.Element {
  const { t } = useTranslation('auth');
  const { language } = useLanguage();
  const navigate = useNavigate();
  const cityName = cityDisplayName(payload.membership, language);

  const copy =
    payload.result === 'already_active'
      ? {
          testId: 'join-already-member',
          title: t('join_already_member_title'),
          body: t('join_already_member_body', { city: cityName }),
        }
      : payload.result === 'already_pending'
        ? {
            testId: 'join-already-pending',
            title: t('join_already_pending_title'),
            body: t('join_already_pending_body', { city: cityName }),
          }
        : payload.result === 'rejected'
          ? {
              testId: 'join-rejected',
              title: t('join_rejected_title'),
              body: t('join_rejected_body', { city: cityName }),
            }
          : {
              testId: 'join-waiting',
              title: t('join_waiting_title'),
              body: t('join_waiting_body', { city: cityName }),
            };

  return (
    <JoinShell>
      <Stack gap="lg">
        <div data-testid={copy.testId}>
          <AppTitle order={1}>{copy.title}</AppTitle>
          <AppText mt="xs">{copy.body}</AppText>
        </div>
        <JoinInstallButton />
        {payload.result === 'already_active' ? (
          <AppButton
            onClick={() => {
              void navigate('/', { replace: true });
            }}
          >
            {t('join_go_home')}
          </AppButton>
        ) : null}
      </Stack>
    </JoinShell>
  );
}

function JoinPreviewAndRedeem({ token }: { token: string }): JSX.Element {
  const { t } = useTranslation('auth');
  const { t: tCommon } = useTranslation('common');
  const { language } = useLanguage();
  const { status } = useSession();
  const [preview, setPreview] = useState<JoinLinkPreview | null>(null);
  const [previewError, setPreviewError] = useState<unknown>(null);
  const [redeemState, setRedeemState] = useState<RedeemState>({
    kind: 'loading',
  });

  useEffect(() => {
    let cancelled = false;

    void previewCityJoinLink(token)
      .then((data) => {
        if (!cancelled) {
          setPreview(data);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setPreviewError(error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (status !== 'ready' || preview === null) {
      return;
    }

    let cancelled = false;
    setRedeemState({ kind: 'loading' });

    void redeemCityJoinLink({ token })
      .then((payload) => {
        if (!cancelled) {
          setRedeemState({ kind: 'result', payload });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setRedeemState({ kind: 'error', error });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [preview, status, token]);

  useEffect(() => {
    if (previewError !== null && isTerminalJoinError(previewError)) {
      clearPersistedJoinToken();
    }
  }, [previewError]);

  useEffect(() => {
    if (redeemState.kind === 'result') {
      clearPersistedJoinToken();
      return;
    }

    if (
      redeemState.kind === 'error' &&
      isTerminalJoinError(redeemState.error)
    ) {
      clearPersistedJoinToken();
    }
  }, [redeemState]);

  if (previewError !== null) {
    return <JoinInvalidState message={joinErrorMessage(t, previewError)} />;
  }

  if (preview === null) {
    return (
      <JoinShell>
        <LoadingState label={tCommon('loading')} />
      </JoinShell>
    );
  }

  if (status === 'anonymous') {
    return <JoinLanding preview={preview} />;
  }

  if (redeemState.kind === 'error') {
    const error = redeemState.error;
    const code = error instanceof ApiError ? error.code : null;
    const cityName = cityDisplayName(preview, language);

    if (code === 'cities.membership_paused') {
      return (
        <JoinShell>
          <AppAlert
            color="yellow"
            title={t('join_title', { city: cityName })}
            data-testid="join-paused"
          >
            {joinErrorMessage(t, error)}
          </AppAlert>
        </JoinShell>
      );
    }

    if (
      code === 'cities.invalid_join_token' ||
      (error instanceof ApiError && error.status === 404)
    ) {
      return <JoinInvalidState message={joinErrorMessage(t, error)} />;
    }

    return (
      <JoinShell>
        <AppAlert
          color="red"
          title={t('join_title', { city: cityName })}
          data-testid="join-error"
        >
          {joinErrorMessage(t, error)}
        </AppAlert>
      </JoinShell>
    );
  }

  if (redeemState.kind === 'result') {
    return <JoinRedeemedState payload={redeemState.payload} />;
  }

  return (
    <JoinShell>
      <LoadingState label={tCommon('loading')} />
    </JoinShell>
  );
}

export function JoinPage(): JSX.Element {
  const { t } = useTranslation('auth');
  const { t: tCommon } = useTranslation('common');
  const { status } = useSession();
  const params = useParams();
  const token = params.token ?? '';

  useEffect(() => {
    if (!isJoinTokenFormatValid(token)) {
      clearPersistedJoinToken();
      return;
    }

    persistJoinToken(token);
  }, [token]);

  if (!isJoinTokenFormatValid(token)) {
    return <JoinInvalidState message={t('cities.invalid_join_token')} />;
  }

  if (status === 'loading') {
    return (
      <JoinShell>
        <LoadingState label={tCommon('loading')} />
      </JoinShell>
    );
  }

  if (status === 'needs_onboarding') {
    persistJoinToken(token);
    return <Navigate to="/onboarding" replace />;
  }

  return <JoinPreviewAndRedeem token={token.trim()} />;
}
