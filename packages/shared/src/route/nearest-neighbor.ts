export interface RouteCoord {
  lat: number;
  lng: number;
}

export interface RouteStopInput<T> {
  id: T;
  coord: RouteCoord | null;
}

export interface OrderedRouteStop<T> {
  id: T;
  visitOrder: number | null;
  placed: boolean;
  coord: RouteCoord | null;
}

const UNSET_COORD_EPSILON = 0.000001;
const EARTH_RADIUS_KM = 6371;

export function isFiniteCoord(
  coord: RouteCoord | null | undefined
): coord is RouteCoord {
  return (
    coord !== null &&
    coord !== undefined &&
    Number.isFinite(coord.lat) &&
    Number.isFinite(coord.lng) &&
    coord.lat >= -90 &&
    coord.lat <= 90 &&
    coord.lng >= -180 &&
    coord.lng <= 180
  );
}

export function isUnsetDefaultCoord(coord: RouteCoord): boolean {
  return (
    Math.abs(coord.lat) < UNSET_COORD_EPSILON &&
    Math.abs(coord.lng) < UNSET_COORD_EPSILON
  );
}

export function isUsableCoord(
  coord: RouteCoord | null | undefined
): coord is RouteCoord {
  return isFiniteCoord(coord) && !isUnsetDefaultCoord(coord);
}

export function haversineKm(from: RouteCoord, to: RouteCoord): number {
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const chord =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(fromLat) *
      Math.cos(toLat) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);
  return (
    2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(chord), Math.sqrt(1 - chord))
  );
}

export function buildGeocodeQuery(
  street: string,
  houseNumber: string,
  cityName: string
): string | null {
  const streetLine = [street.trim(), houseNumber.trim()]
    .filter((part) => part.length > 0)
    .join(' ');
  if (streetLine.length === 0) {
    return null;
  }
  const city = cityName.trim();
  return city.length > 0 ? `${streetLine}, ${city}` : streetLine;
}

export function orderStopsNearestNeighbor<T extends string>(
  start: RouteCoord | null,
  stops: ReadonlyArray<RouteStopInput<T>>
): Array<OrderedRouteStop<T>> {
  const placed: Array<RouteStopInput<T> & { coord: RouteCoord }> = [];
  const unplaced: Array<RouteStopInput<T>> = [];

  for (const stop of stops) {
    if (isUsableCoord(stop.coord)) {
      placed.push({ id: stop.id, coord: stop.coord });
    } else {
      unplaced.push({ id: stop.id, coord: null });
    }
  }

  const remaining = [...placed];
  const ordered: Array<RouteStopInput<T> & { coord: RouteCoord }> = [];
  let current: RouteCoord | null = isUsableCoord(start) ? start : null;

  while (remaining.length > 0) {
    const nextIndex = indexOfNearest(current, remaining);
    const [next] = remaining.splice(nextIndex, 1);
    if (next === undefined) {
      break;
    }
    ordered.push(next);
    current = next.coord;
  }

  return [
    ...ordered.map((stop, index) => ({
      id: stop.id,
      visitOrder: index + 1,
      placed: true,
      coord: stop.coord,
    })),
    ...unplaced.map((stop) => ({
      id: stop.id,
      visitOrder: null,
      placed: false,
      coord: null,
    })),
  ];
}

function indexOfNearest<T extends string>(
  current: RouteCoord | null,
  remaining: ReadonlyArray<RouteStopInput<T> & { coord: RouteCoord }>
): number {
  if (current === null || remaining.length === 0) {
    return 0;
  }

  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestId = remaining[0]?.id ?? '';

  for (let index = 0; index < remaining.length; index += 1) {
    const candidate = remaining[index];
    if (candidate === undefined) {
      continue;
    }
    const distance = haversineKm(current, candidate.coord);
    if (
      distance < bestDistance - Number.EPSILON ||
      (Math.abs(distance - bestDistance) <= Number.EPSILON &&
        candidate.id.localeCompare(bestId) < 0)
    ) {
      bestIndex = index;
      bestDistance = distance;
      bestId = candidate.id;
    }
  }

  return bestIndex;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
