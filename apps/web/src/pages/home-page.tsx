import { Stack } from '@mantine/core';
import {
  getActiveCoordinatorCities,
  getActiveVolunteerCities,
  getUserDisplayName,
} from '@giving-day/shared';
import { AppButton, AppText, AppTitle, LoadingState } from '@giving-day/ui';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useListDistributionDays } from '../api/generated/api';
import { useSession } from '../auth/session-provider';
import {
  formatDayHours,
  formatDistributionDate,
} from '../distribution-days/format-day';
import { useLanguage } from '../i18n/use-language';
import { AppChrome } from '../layout/app-chrome';

function VolunteerCityDays({ cityId }: { cityId: string }): JSX.Element {
  const { language } = useLanguage();
  const { t } = useTranslation('volunteer');
  const { t: tCommon } = useTranslation('common');
  const navigate = useNavigate();
  const query = useListDistributionDays(cityId);

  if (query.isLoading) {
    return <LoadingState label={tCommon('loading')} />;
  }

  const days = query.data?.days ?? [];

  return (
    <Stack gap="sm" data-testid="volunteer-open-days">
      <AppTitle order={2}>{t('open_days_title')}</AppTitle>
      {days.length === 0 ? (
        <AppText c="dimmed">{t('no_open_days')}</AppText>
      ) : (
        days.map((day) => (
          <Stack key={day.id} gap={4}>
            <AppText fw={600}>
              {formatDistributionDate(day.date, language)}
            </AppText>
            <AppText c="dimmed" size="sm">
              {formatDayHours(day.startTime, day.endTime)}
            </AppText>
            <AppButton
              size="sm"
              onClick={() => {
                void navigate(`/cities/${cityId}/days/${day.id}`);
              }}
            >
              {t('respond_cta')}
            </AppButton>
          </Stack>
        ))
      )}
    </Stack>
  );
}

function CoordinatorCityDays({ cityId }: { cityId: string }): JSX.Element {
  const { language } = useLanguage();
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation('common');
  const navigate = useNavigate();
  const query = useListDistributionDays(cityId);

  const days = query.data?.days ?? [];

  return (
    <Stack gap="sm" data-testid="coordinator-days">
      <AppButton
        size="sm"
        variant="light"
        data-testid="view-elders"
        onClick={() => {
          void navigate(`/cities/${cityId}/elders`);
        }}
      >
        {t('view_elders')}
      </AppButton>
      <AppButton
        size="sm"
        variant="light"
        data-testid="view-join-requests"
        onClick={() => {
          void navigate(`/cities/${cityId}/join-requests`);
        }}
      >
        {t('view_join_requests')}
      </AppButton>
      <AppButton
        size="sm"
        variant="light"
        data-testid="view-change-requests"
        onClick={() => {
          void navigate(`/cities/${cityId}/change-requests`);
        }}
      >
        {t('view_change_requests')}
      </AppButton>
      <AppButton
        size="sm"
        variant="light"
        data-testid="view-matches"
        onClick={() => {
          void navigate(`/cities/${cityId}/matches`);
        }}
      >
        {t('view_matches')}
      </AppButton>
      <AppButton
        size="sm"
        variant="light"
        data-testid="view-settings"
        onClick={() => {
          void navigate(`/cities/${cityId}/settings`);
        }}
      >
        {t('view_settings')}
      </AppButton>
      <AppTitle order={2}>{t('open_days_title')}</AppTitle>
      {query.isLoading ? (
        <LoadingState label={tCommon('loading')} />
      ) : days.length === 0 ? (
        <AppText c="dimmed">{t('no_days')}</AppText>
      ) : (
        days.map((day) => (
          <Stack key={day.id} gap={4}>
            <AppText fw={600}>
              {formatDistributionDate(day.date, language)}
            </AppText>
            <AppText c="dimmed" size="sm">
              {formatDayHours(day.startTime, day.endTime)}
            </AppText>
            <AppButton
              size="sm"
              variant="light"
              onClick={() => {
                void navigate(`/cities/${cityId}/days/${day.id}/responses`);
              }}
            >
              {t('view_responses')}
            </AppButton>
            <AppButton
              size="sm"
              variant="light"
              onClick={() => {
                void navigate(`/cities/${cityId}/days/${day.id}/deliveries`);
              }}
            >
              {t('view_deliveries')}
            </AppButton>
          </Stack>
        ))
      )}
    </Stack>
  );
}

export function HomePage(): JSX.Element {
  const { t } = useTranslation('auth');
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const displayName = user === null ? '' : getUserDisplayName(user);
  const volunteerCities = user === null ? [] : getActiveVolunteerCities(user);
  const coordinatorCities =
    user === null ? [] : getActiveCoordinatorCities(user);
  const hasCityTools =
    volunteerCities.length > 0 || coordinatorCities.length > 0;

  return (
    <AppChrome
      actions={
        <AppButton
          size="xs"
          variant="light"
          onClick={() => {
            void logout().finally(() => {
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
          {hasCityTools ? null : (
            <AppText c="dimmed" mt="sm">
              {t('home_empty')}
            </AppText>
          )}
        </div>
        {volunteerCities.map((cityId) => (
          <VolunteerCityDays key={`volunteer-${cityId}`} cityId={cityId} />
        ))}
        {coordinatorCities.map((cityId) => (
          <CoordinatorCityDays key={`coordinator-${cityId}`} cityId={cityId} />
        ))}
      </Stack>
    </AppChrome>
  );
}
