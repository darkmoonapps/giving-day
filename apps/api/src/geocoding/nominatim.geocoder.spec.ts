import { afterEach, describe, expect, it, vi } from 'vitest';
import { NominatimGeocoder } from './nominatim.geocoder';

describe('NominatimGeocoder', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NOMINATIM_URL;
  });

  it('parses a Holon hit, caches it, and does not call the network again', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse([
        {
          lat: '32.011400',
          lon: '34.774800',
        },
      ])
    );
    const geocoder = new NominatimGeocoder(
      fetchImpl,
      () => 0,
      async () => {
        return;
      }
    );

    const first = await geocoder.geocode('10 Warehouse Rd, Holon');
    const second = await geocoder.geocode('10 Warehouse Rd, Holon');

    expect(first).toEqual({
      kind: 'hit',
      coord: { lat: 32.0114, lng: 34.7748 },
    });
    expect(second).toEqual(first);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain(
      'q=10+Warehouse+Rd%2C+Holon'
    );
    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({
      headers: {
        Accept: 'application/json',
        'User-Agent': expect.stringContaining('GivingDay/1.0'),
      },
    });
  });

  it('treats an empty successful response as a cached no-hit', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse([]));
    const geocoder = new NominatimGeocoder(
      fetchImpl,
      () => 0,
      async () => {
        return;
      }
    );

    await expect(geocoder.geocode('12 Example St 12, Holon')).resolves.toEqual({
      kind: 'no_hit',
    });
    await expect(geocoder.geocode('12 Example St 12, Holon')).resolves.toEqual({
      kind: 'no_hit',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retries after a network error instead of caching the failure', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(
        jsonResponse([
          {
            lat: '32.018800',
            lon: '34.779200',
          },
        ])
      );
    const geocoder = new NominatimGeocoder(
      fetchImpl,
      () => 0,
      async () => {
        return;
      }
    );

    await expect(geocoder.geocode('12 Example St 12, Holon')).resolves.toEqual({
      kind: 'transient',
    });
    await expect(geocoder.geocode('12 Example St 12, Holon')).resolves.toEqual({
      kind: 'hit',
      coord: { lat: 32.0188, lng: 34.7792 },
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('retries after a timeout or non-2xx instead of caching the failure', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new DOMException('The operation was aborted.'))
      .mockResolvedValueOnce({ ok: false, status: 503 } as Response)
      .mockResolvedValueOnce(jsonResponse([]));
    const geocoder = new NominatimGeocoder(
      fetchImpl,
      () => 0,
      async () => {
        return;
      }
    );

    await expect(geocoder.geocode('4 Park Ave 4, Holon')).resolves.toEqual({
      kind: 'transient',
    });
    await expect(geocoder.geocode('4 Park Ave 4, Holon')).resolves.toEqual({
      kind: 'transient',
    });
    await expect(geocoder.geocode('4 Park Ave 4, Holon')).resolves.toEqual({
      kind: 'no_hit',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('waits at least a second between lookups', async () => {
    let now = 1_000;
    const waits: number[] = [];
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse([]));
    const geocoder = new NominatimGeocoder(
      fetchImpl,
      () => now,
      async (ms) => {
        waits.push(ms);
        now += ms;
      }
    );

    await geocoder.geocode('12 Example St 12, Holon');
    await geocoder.geocode('4 Park Ave 4, Holon');

    expect(waits).toEqual([1100]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    json: async (): Promise<unknown> => body,
  } as Response;
}
