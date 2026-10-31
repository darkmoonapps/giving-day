import type { RouteCoord } from '@giving-day/shared';

export const GEOCODER = Symbol('GEOCODER');

export interface Geocoder {
  geocode(query: string): Promise<RouteCoord | null>;
}
