import type { VolunteerDayRoute } from '@giving-day/shared';
import type { VolunteerDayRouteResponseDto } from '../api/generated/api';
import { AppAlert, AppBadge, AppText, AppTitle } from '@giving-day/ui';
import { Group, Stack } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { ElderAddress } from './elder-address';
import { NavigateMenu } from './navigate-menu';
import {
  elderMapsSearchQuery,
  locationHintsText,
  mapsQueryFromFreeText,
} from './navigation-links';
import { VolunteerRouteMap } from './volunteer-route-map';

export function VolunteerRoutePanel({
  route,
  cityName,
  loadError,
}: {
  route: VolunteerDayRoute | VolunteerDayRouteResponseDto | undefined;
  cityName: string;
  loadError: boolean;
}): JSX.Element {
  const { t } = useTranslation('volunteer');
  const labels = {
    entrance: t('entrance_label'),
    floor: t('floor_label'),
    apartment: t('apartment_label'),
  };
  const hintLabels = {
    entrance: t('entrance_label'),
    buildingCode: t('building_code_label'),
  };

  if (loadError) {
    return (
      <AppAlert color="yellow" data-testid="volunteer-route-error">
        {t('route_load_error')}
      </AppAlert>
    );
  }

  if (route === undefined) {
    return <></>;
  }

  const centerQuery = mapsQueryFromFreeText(route.center.address);
  const hasStops = route.stops.length > 0;
  const hasUnplaced = route.stops.some((stop) => !stop.placed);

  return (
    <Stack gap="sm" data-testid="volunteer-route-panel">
      <div>
        <AppTitle order={3}>{t('route_title')}</AppTitle>
        <AppText size="sm" c="dimmed" mt={4}>
          {t('route_subtitle')}
        </AppText>
      </div>

      <VolunteerRouteMap route={route} />

      {!route.center.placed && route.center.address.trim().length > 0 ? (
        <AppText size="sm" data-testid="volunteer-route-center-unplaced">
          {t('route_center_unplaced')}
        </AppText>
      ) : null}

      <Stack gap="xs" data-testid="volunteer-route-center">
        <Group gap="xs" wrap="wrap">
          <AppBadge color="teal" data-testid="volunteer-route-center-badge">
            {t('route_center_label')}
          </AppBadge>
          <AppText fw={600}>{route.center.address}</AppText>
        </Group>
        {centerQuery !== null ? (
          <NavigateMenu
            query={centerQuery}
            label={t('navigate_center_menu')}
            ariaLabel={t('navigate_center_menu')}
            testId="route-navigate-center-menu"
          />
        ) : null}
      </Stack>

      {!hasStops ? (
        <AppText data-testid="volunteer-route-empty">
          {t('route_empty')}
        </AppText>
      ) : (
        <Stack gap="sm" data-testid="volunteer-route-stops" component="ol">
          {route.stops.map((stop) => (
            <Stack
              key={stop.deliveryId}
              gap={4}
              data-testid="volunteer-route-stop"
              data-delivery-id={stop.deliveryId}
              data-placed={stop.placed ? 'true' : 'false'}
              component="li"
            >
              <Group gap="xs" wrap="wrap">
                {stop.placed && stop.visitOrder !== null ? (
                  <AppBadge
                    color="grape"
                    data-testid="volunteer-route-stop-number"
                  >
                    {t('route_stop_number', { number: stop.visitOrder })}
                  </AppBadge>
                ) : (
                  <AppBadge
                    color="yellow"
                    data-testid="volunteer-route-stop-unplaced"
                  >
                    {t('route_unplaced')}
                  </AppBadge>
                )}
                <AppText fw={600}>{stop.elder.fullName}</AppText>
              </Group>
              <ElderAddress elder={stop.elder} labels={labels} />
              <NavigateMenu
                query={elderMapsSearchQuery(stop.elder, cityName)}
                visibleHints={locationHintsText(stop.elder, hintLabels)}
                label={t('navigate_menu')}
                ariaLabel={t('navigate_to_elder', {
                  name: stop.elder.fullName,
                })}
                testId="route-navigate-menu"
              />
            </Stack>
          ))}
        </Stack>
      )}

      {hasUnplaced ? (
        <AppText size="sm" data-testid="volunteer-route-unplaced-hint">
          {t('route_unplaced_hint')}
        </AppText>
      ) : null}
    </Stack>
  );
}
