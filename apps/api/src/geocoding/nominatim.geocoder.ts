import { Injectable, Logger } from '@nestjs/common';
import { isUsableCoord, type RouteCoord } from '@giving-day/shared';
import type { GeocodeOutcome, Geocoder } from './geocoding.tokens';

const NOMINATIM_SEARCH_PATH = '/search';
const DEFAULT_NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
const MIN_REQUEST_GAP_MS = 1100;
const REQUEST_TIMEOUT_MS = 5000;
const USER_AGENT =
  'GivingDay/1.0 (volunteer-route; https://github.com/darkmoonapps/giving-day)';

interface NominatimSearchHit {
  lat?: unknown;
  lon?: unknown;
}

@Injectable()
export class NominatimGeocoder implements Geocoder {
  private readonly logger = new Logger(NominatimGeocoder.name);
  private readonly cache = new Map<string, GeocodeOutcome>();
  private readonly inFlight = new Map<string, Promise<GeocodeOutcome>>();
  private nextAllowedAt = 0;

  constructor(
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly now: () => number = Date.now,
    private readonly wait: (ms: number) => Promise<void> = sleep
  ) {}

  async geocode(query: string): Promise<GeocodeOutcome> {
    const normalized = query.trim();
    if (normalized.length === 0) {
      return { kind: 'no_hit' };
    }

    const cached = this.cache.get(normalized);
    if (cached !== undefined) {
      return cached;
    }

    const pending = this.inFlight.get(normalized);
    if (pending !== undefined) {
      return pending;
    }

    const request = this.lookup(normalized).finally(() => {
      this.inFlight.delete(normalized);
    });
    this.inFlight.set(normalized, request);
    return request;
  }

  private async lookup(query: string): Promise<GeocodeOutcome> {
    await this.respectRateLimit();

    const url = new URL(
      NOMINATIM_SEARCH_PATH,
      process.env.NOMINATIM_URL ?? DEFAULT_NOMINATIM_URL
    );
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');

    try {
      const response = await this.fetchImpl(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': USER_AGENT,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) {
        return { kind: 'transient' };
      }

      const payload: unknown = await response.json();
      const coord = firstUsableHit(payload);
      const outcome: GeocodeOutcome =
        coord === null ? { kind: 'no_hit' } : { kind: 'hit', coord };
      this.cache.set(query, outcome);
      return outcome;
    } catch (error: unknown) {
      this.logger.warn(
        `Nominatim lookup failed for a Holon address query: ${errorMessage(error)}`
      );
      return { kind: 'transient' };
    }
  }

  private async respectRateLimit(): Promise<void> {
    const now = this.now();
    const waitMs = this.nextAllowedAt - now;
    this.nextAllowedAt = Math.max(this.nextAllowedAt, now) + MIN_REQUEST_GAP_MS;
    if (waitMs > 0) {
      await this.wait(waitMs);
    }
  }
}

function firstUsableHit(payload: unknown): RouteCoord | null {
  if (!Array.isArray(payload) || payload.length === 0) {
    return null;
  }
  const hit = payload[0] as NominatimSearchHit;
  const lat = parseCoordPart(hit.lat);
  const lng = parseCoordPart(hit.lon);
  if (lat === null || lng === null) {
    return null;
  }
  const coord = { lat, lng };
  return isUsableCoord(coord) ? coord : null;
}

function parseCoordPart(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
