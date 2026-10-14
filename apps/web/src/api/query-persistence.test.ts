import { dehydrate, QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import {
  DISTRIBUTION_DAY_DETAILS_QUERY_ROOT,
  QUERY_CACHE_STORAGE_KEY,
  createDistributionDayPersister,
  distributionDayDetailsQueryKey,
  isDistributionDayDetailsQueryKey,
  shouldDehydrateMutation,
  shouldPersistDistributionDayDetailsQuery,
} from './query-persistence';

describe('distribution-day query persistence', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('identifies distribution-day details query keys', () => {
    expect(
      isDistributionDayDetailsQueryKey(distributionDayDetailsQueryKey('day-1'))
    ).toBe(true);
    expect(isDistributionDayDetailsQueryKey(['/api/health'])).toBe(false);
    expect(distributionDayDetailsQueryKey('day-1')[0]).toBe(
      DISTRIBUTION_DAY_DETAILS_QUERY_ROOT
    );
  });

  it('does not persist mutations', () => {
    expect(shouldDehydrateMutation()).toBe(false);
  });

  it('persists only distribution-day details queries to localStorage', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(distributionDayDetailsQueryKey('day-1'), {
      date: '2026-11-01',
      notes: 'Warehouse opens at 08:00',
    });
    queryClient.setQueryData(['/api/health'], {
      status: 'healthy',
      timestamp: '2026-01-15T10:00:00.000Z',
      database: { connected: true },
    });

    const detailsQuery = queryClient
      .getQueryCache()
      .find({ queryKey: distributionDayDetailsQueryKey('day-1') });
    const healthQuery = queryClient
      .getQueryCache()
      .find({ queryKey: ['/api/health'] });

    expect(detailsQuery).toBeDefined();
    expect(healthQuery).toBeDefined();
    if (detailsQuery === undefined || healthQuery === undefined) {
      throw new Error('expected health and distribution-day queries');
    }
    expect(shouldPersistDistributionDayDetailsQuery(detailsQuery)).toBe(true);
    expect(shouldPersistDistributionDayDetailsQuery(healthQuery)).toBe(false);

    const clientState = dehydrate(queryClient, {
      shouldDehydrateQuery: shouldPersistDistributionDayDetailsQuery,
      shouldDehydrateMutation,
    });
    expect(clientState.queries).toHaveLength(1);
    expect(clientState.queries[0]?.queryKey).toEqual(
      distributionDayDetailsQueryKey('day-1')
    );

    void createDistributionDayPersister(0).persistClient({
      timestamp: Date.now(),
      buster: '',
      clientState,
    });

    await waitFor(() => {
      const stored = window.localStorage.getItem(QUERY_CACHE_STORAGE_KEY);
      expect(stored).toContain(DISTRIBUTION_DAY_DETAILS_QUERY_ROOT);
      expect(stored).toContain('day-1');
      expect(stored).not.toContain('/api/health');
    });
  });
});
