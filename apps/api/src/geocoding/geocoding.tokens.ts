import type { RouteCoord } from '@giving-day/shared';

export const GEOCODER = Symbol('GEOCODER');

export type GeocodeOutcome =
  | { kind: 'hit'; coord: RouteCoord }
  | { kind: 'no_hit' }
  | { kind: 'transient' };

export interface Geocoder {
  geocode(query: string): Promise<GeocodeOutcome>;
}
