import { Group } from '@mantine/core';
import {
  AppHeader,
  AppPageShell,
  ColorSchemeToggle,
  LanguageSwitcher,
} from '@giving-day/ui';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../i18n/use-language';
import { useUiStore } from '../stores/ui-store';

export interface AppChromeProps {
  children: ReactNode;
  actions?: ReactNode;
}

export function AppChrome({ children, actions }: AppChromeProps): JSX.Element {
  const { t } = useTranslation('common');
  const { language, setLanguage } = useLanguage();
  const colorScheme = useUiStore((state) => state.colorScheme);
  const setColorScheme = useUiStore((state) => state.setColorScheme);

  return (
    <AppPageShell
      header={
        <AppHeader
          title={t('app_name')}
          actions={
            <Group gap="sm" wrap="wrap" justify="flex-end">
              {actions}
              <LanguageSwitcher
                value={language}
                label={t('language.label')}
                options={[
                  { code: 'he', label: t('language.he') },
                  { code: 'en', label: t('language.en') },
                ]}
                onChange={(nextLanguage) => {
                  void setLanguage(nextLanguage);
                }}
              />
              <ColorSchemeToggle
                value={colorScheme}
                onChange={setColorScheme}
                label={t('color_scheme.label')}
                lightLabel={t('color_scheme.light')}
                darkLabel={t('color_scheme.dark')}
                systemLabel={t('color_scheme.system')}
              />
            </Group>
          }
        />
      }
    >
      {children}
    </AppPageShell>
  );
}
