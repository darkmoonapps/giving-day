import { useState } from 'react';
import { AppButton, AppText } from '@giving-day/ui';
import { useTranslation } from 'react-i18next';
import {
  canPromptInstall,
  isStandaloneDisplay,
  promptInstall,
  shouldShowIosInstallHelp,
} from '../auth/pwa-install';

export function JoinInstallButton(): JSX.Element | null {
  const { t } = useTranslation('auth');
  const [iosHelp, setIosHelp] = useState(false);
  const [unavailableHint, setUnavailableHint] = useState(false);

  if (isStandaloneDisplay()) {
    return null;
  }

  const handleInstall = async (): Promise<void> => {
    if (canPromptInstall()) {
      await promptInstall();
      return;
    }

    if (shouldShowIosInstallHelp()) {
      setIosHelp(true);
      setUnavailableHint(false);
      return;
    }

    setUnavailableHint(true);
  };

  return (
    <>
      <AppButton
        variant="light"
        fullWidth
        data-testid="install-app"
        onClick={() => {
          void handleInstall();
        }}
      >
        {t('install_app')}
      </AppButton>
      {iosHelp ? (
        <AppText data-testid="install-ios-help">
          {t('install_ios_body')}
        </AppText>
      ) : null}
      {unavailableHint ? (
        <AppText data-testid="install-unavailable">
          {t('install_unavailable')}
        </AppText>
      ) : null}
    </>
  );
}
