import { Group, Stack } from '@mantine/core';
import { healthResponseSchema } from '@giving-day/shared';
import {
  AppHeader,
  AppPageShell,
  AppText,
  AppTitle,
  ColorSchemeToggle,
  HealthStatusCard,
  LanguageSwitcher,
} from '@giving-day/ui';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { ApiError } from './api/mutator';
import { useHealthQuery } from './api/use-health-query';
import { useLanguage } from './i18n/use-language';
import { useUiStore } from './stores/ui-store';

function formatCheckedAt(timestamp: string, language: string): string {
  return new Date(timestamp).toLocaleString(
    language === 'he' ? 'he-IL' : 'en-US'
  );
}

function App(): JSX.Element {
  const { t } = useTranslation('common');
  const { language, setLanguage } = useLanguage();
  const statusDetailsOpen = useUiStore((state) => state.statusDetailsOpen);
  const toggleStatusDetails = useUiStore((state) => state.toggleStatusDetails);
  const colorScheme = useUiStore((state) => state.colorScheme);
  const setColorScheme = useUiStore((state) => state.setColorScheme);
  const healthQuery = useHealthQuery();

  const parsedHealth =
    healthQuery.data !== undefined
      ? healthResponseSchema.safeParse(healthQuery.data)
      : null;
  const health = parsedHealth?.success === true ? parsedHealth.data : undefined;

  const errorMessage = getHealthErrorMessage(healthQuery.error, t);

  return (
    <AppPageShell
      header={
        <AppHeader
          title={t('app_name')}
          actions={
            <Group gap="sm" wrap="wrap" justify="flex-end">
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
      <Stack gap="lg">
        <div>
          <AppTitle order={1}>{t('welcome_title')}</AppTitle>
          <AppText c="dimmed" mt="xs">
            {t('welcome_subtitle')}
          </AppText>
        </div>

        <HealthStatusCard
          title={t('health.title')}
          loadingLabel={t('health.loading')}
          errorTitle={t('health.error_title')}
          errorMessage={errorMessage}
          apiStatusLabel={t('health.api_status')}
          databaseLabel={t('health.database')}
          apiStatusValue={health ? t(`health.${health.status}`) : null}
          databaseValue={
            health
              ? t(
                  health.database.connected
                    ? 'health.connected'
                    : 'health.disconnected'
                )
              : null
          }
          lastCheckedLabel={t('health.last_checked')}
          lastCheckedValue={
            health ? formatCheckedAt(health.timestamp, language) : null
          }
          detailsToggleLabel={t(
            statusDetailsOpen ? 'health.hide_details' : 'health.show_details'
          )}
          isLoading={healthQuery.isLoading}
          detailsOpen={statusDetailsOpen}
          onToggleDetails={toggleStatusDetails}
          status={health?.status ?? null}
          databaseConnected={health?.database.connected ?? null}
        />

        <section>
          <AppTitle order={4} mb="sm">
            {t('about_title')}
          </AppTitle>
          <AppText size="sm">{t('about_body')}</AppText>
        </section>
      </Stack>
    </AppPageShell>
  );
}

function getHealthErrorMessage(
  error: unknown,
  t: TFunction<'common'>
): string | null {
  if (error === null || error === undefined) {
    return null;
  }

  if (error instanceof ApiError) {
    return t('health.http_error', { status: error.status });
  }

  return t('health.fetch_error');
}

export default App;
