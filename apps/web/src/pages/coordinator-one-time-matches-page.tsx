import { Stack } from '@mantine/core';
import { getActiveCoordinatorCities } from '@giving-day/shared';
import {
  AppAlert,
  AppButton,
  AppText,
  AppTitle,
  LoadingState,
} from '@giving-day/ui';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useGetDistributionDay } from '../api/generated/api';
import { useSession } from '../auth/session-provider';
import {
  formatDistributionDate,
  isUuid,
} from '../distribution-days/format-day';
import { useLanguage } from '../i18n/use-language';
import { AppChrome } from '../layout/app-chrome';
import { CoordinatorOneTimeMatchesPanel } from '../matches/coordinator-one-time-matches-panel';

export function CoordinatorOneTimeMatchesPage(): JSX.Element {
  const { cityId, dayId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useSession();
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation('common');
  const validIds = isUuid(cityId) && isUuid(dayId);
  const coordinatorCities =
    user === null ? [] : getActiveCoordinatorCities(user);
  const allowed =
    validIds && coordinatorCities.includes(cityId ?? '') && dayId !== undefined;

  const dayQuery = useGetDistributionDay(cityId ?? '', dayId ?? '', {
    query: { enabled: allowed },
  });
  const day = dayQuery.data;
  const loading = dayQuery.isLoading || day === undefined;
  const denied = validIds && !allowed;
  const failed = !validIds || dayQuery.isError;

  return (
    <AppChrome
      actions={
        <AppButton
          size="xs"
          variant="light"
          onClick={() => {
            void navigate('/');
          }}
        >
          {tCommon('back')}
        </AppButton>
      }
    >
      <Stack
        gap="lg"
        component="section"
        data-testid="coordinator-one-time-matches-page"
      >
        {denied ? (
          <AppAlert
            color="red"
            title={t('one_time_matches_no_access_title')}
            data-testid="one-time-matches-no-access"
          >
            {t('one_time_matches_no_access')}
          </AppAlert>
        ) : failed ? (
          <AppAlert color="red" title={tCommon('error.unexpected_title')}>
            {t('one_time_matches_load_error')}
          </AppAlert>
        ) : loading || day === undefined ? (
          <LoadingState label={tCommon('loading')} />
        ) : cityId === undefined || dayId === undefined ? null : (
          <>
            <div>
              <AppTitle order={1}>{t('one_time_matches_title')}</AppTitle>
              <AppText mt="xs">
                {formatDistributionDate(day.date, language)}
              </AppText>
              <AppText c="dimmed" mt="sm">
                {t('one_time_matches_subtitle')}
              </AppText>
            </div>
            <AppButton
              size="sm"
              variant="light"
              data-testid="one-time-matches-view-deliveries"
              onClick={() => {
                void navigate(`/cities/${cityId}/days/${dayId}/deliveries`);
              }}
            >
              {t('view_deliveries')}
            </AppButton>
            <CoordinatorOneTimeMatchesPanel
              cityId={cityId}
              dayId={dayId}
              enabled={allowed}
              showTitle={false}
            />
          </>
        )}
      </Stack>
    </AppChrome>
  );
}
