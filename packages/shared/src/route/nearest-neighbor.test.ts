import { describe, expect, it } from 'vitest';
import {
  buildGeocodeQuery,
  haversineKm,
  isUnsetDefaultCoord,
  isUsableCoord,
  orderStopsNearestNeighbor,
} from './nearest-neighbor';

const HOLON_CENTER = { lat: 32.0114, lng: 34.7748 };
const RIVKAH = { lat: 32.0188, lng: 34.7792 };
const YOSEF = { lat: 32.026, lng: 34.79 };
const MIRIAM = { lat: 32.008, lng: 34.768 };

describe('isUsableCoord', () => {
  it('rejects missing, non-finite, and the 0,0 city-settings default', () => {
    expect(isUsableCoord(null)).toBe(false);
    expect(isUsableCoord({ lat: Number.NaN, lng: 34.77 })).toBe(false);
    expect(isUsableCoord({ lat: 0, lng: 0 })).toBe(false);
    expect(isUnsetDefaultCoord({ lat: 0, lng: 0 })).toBe(true);
    expect(isUsableCoord(HOLON_CENTER)).toBe(true);
  });
});

describe('buildGeocodeQuery', () => {
  it('builds a Holon street query without entrance or building code', () => {
    expect(buildGeocodeQuery('12 Example St', '12', 'Holon')).toBe(
      '12 Example St 12, Holon'
    );
    expect(buildGeocodeQuery('  ', '', 'Holon')).toBeNull();
    expect(buildGeocodeQuery('12 Example St', '12', '')).toBe(
      '12 Example St 12'
    );
  });
});

describe('haversineKm', () => {
  it('measures Holon-scale distances', () => {
    const rivkahFromCenter = haversineKm(HOLON_CENTER, RIVKAH);
    const yosefFromCenter = haversineKm(HOLON_CENTER, YOSEF);
    expect(rivkahFromCenter).toBeGreaterThan(0.5);
    expect(rivkahFromCenter).toBeLessThan(1.5);
    expect(yosefFromCenter).toBeGreaterThan(rivkahFromCenter);
  });
});

describe('orderStopsNearestNeighbor', () => {
  it('walks nearest-neighbor from the Holon distribution center', () => {
    const ordered = orderStopsNearestNeighbor(HOLON_CENTER, [
      { id: 'yosef', coord: YOSEF },
      { id: 'rivkah', coord: RIVKAH },
      { id: 'miriam', coord: MIRIAM },
    ]);

    expect(ordered.map((stop) => stop.id)).toEqual([
      'miriam',
      'rivkah',
      'yosef',
    ]);
    expect(ordered.map((stop) => stop.visitOrder)).toEqual([1, 2, 3]);
    expect(ordered.every((stop) => stop.placed)).toBe(true);
  });

  it('keeps unplaced stops after numbered ones without a visit order', () => {
    const ordered = orderStopsNearestNeighbor(HOLON_CENTER, [
      { id: 'yosef', coord: null },
      { id: 'rivkah', coord: RIVKAH },
    ]);

    expect(ordered).toEqual([
      {
        id: 'rivkah',
        visitOrder: 1,
        placed: true,
        coord: RIVKAH,
      },
      {
        id: 'yosef',
        visitOrder: null,
        placed: false,
        coord: null,
      },
    ]);
  });

  it('starts from the first placed stop when the center cannot be placed', () => {
    const ordered = orderStopsNearestNeighbor(null, [
      { id: 'yosef', coord: YOSEF },
      { id: 'rivkah', coord: RIVKAH },
    ]);

    expect(ordered[0]).toMatchObject({
      id: 'yosef',
      visitOrder: 1,
      placed: true,
    });
    expect(ordered[1]).toMatchObject({
      id: 'rivkah',
      visitOrder: 2,
      placed: true,
    });
  });

  it('breaks equal-distance ties by id for a stable order', () => {
    const twin = { lat: 32.02, lng: 34.78 };
    const ordered = orderStopsNearestNeighbor(twin, [
      { id: 'b-stop', coord: twin },
      { id: 'a-stop', coord: twin },
    ]);

    expect(ordered.map((stop) => stop.id)).toEqual(['a-stop', 'b-stop']);
  });
});
