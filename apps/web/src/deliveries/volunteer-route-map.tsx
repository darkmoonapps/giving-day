import { useEffect, useId, useRef } from 'react';
import type { VolunteerDayRoute } from '@giving-day/shared';
import { useTranslation } from 'react-i18next';
import type { VolunteerDayRouteResponseDto } from '../api/generated/api';
import 'leaflet/dist/leaflet.css';
import './volunteer-route-map.css';

const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export function VolunteerRouteMap({
  route,
}: {
  route: VolunteerDayRoute | VolunteerDayRouteResponseDto;
}): JSX.Element | null {
  const { t } = useTranslation('volunteer');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapLabelId = useId();
  const placedStops = route.stops.filter(
    (stop) => stop.placed && stop.lat !== null && stop.lng !== null
  );
  const centerPlaced =
    route.center.placed &&
    route.center.lat !== null &&
    route.center.lng !== null;

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }
    if (container.offsetWidth === 0 || container.offsetHeight === 0) {
      return;
    }
    const stopsOnMap = route.stops.filter(
      (stop) => stop.placed && stop.lat !== null && stop.lng !== null
    );
    const hasCenter =
      route.center.placed &&
      route.center.lat !== null &&
      route.center.lng !== null;
    if (!hasCenter && stopsOnMap.length === 0) {
      return;
    }

    let cancelled = false;
    let map: import('leaflet').Map | undefined;

    void import('leaflet').then((leaflet) => {
      if (cancelled || containerRef.current === null) {
        return;
      }
      const L = leaflet.default;
      const points: import('leaflet').LatLngExpression[] = [];
      map = L.map(container, {
        scrollWheelZoom: false,
        attributionControl: true,
      });
      L.tileLayer(OSM_TILE_URL, {
        attribution: OSM_ATTRIBUTION,
        maxZoom: 19,
      }).addTo(map);

      if (
        route.center.placed &&
        route.center.lat !== null &&
        route.center.lng !== null
      ) {
        const centerPoint: import('leaflet').LatLngExpression = [
          route.center.lat,
          route.center.lng,
        ];
        points.push(centerPoint);
        L.marker(centerPoint, {
          icon: L.divIcon({
            className: '',
            html: `<div class="volunteer-route-center-marker" aria-hidden="true">★</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
        })
          .addTo(map)
          .bindPopup(route.center.address);
      }

      for (const stop of stopsOnMap) {
        if (stop.lat === null || stop.lng === null) {
          continue;
        }
        const point: import('leaflet').LatLngExpression = [stop.lat, stop.lng];
        points.push(point);
        const label = stop.visitOrder ?? '';
        L.marker(point, {
          icon: L.divIcon({
            className: '',
            html: `<div class="volunteer-route-marker" aria-hidden="true">${String(label)}</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
        })
          .addTo(map)
          .bindPopup(stop.elder.fullName);
      }

      if (points.length >= 2) {
        L.polyline(points, { color: '#A99BE0', weight: 4 }).addTo(map);
      }

      if (points.length === 1) {
        map.setView(points[0], 15);
      } else if (points.length > 1) {
        map.fitBounds(L.latLngBounds(points), { padding: [24, 24] });
      }
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [route]);

  if (!centerPlaced && placedStops.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="volunteer-route-map"
      data-testid="volunteer-route-map"
      dir="ltr"
      role="img"
      aria-labelledby={mapLabelId}
    >
      <span id={mapLabelId} hidden>
        {t('route_map_label')}
      </span>
    </div>
  );
}
