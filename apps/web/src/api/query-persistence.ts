import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import {
  defaultShouldDehydrateQuery,
  QueryClient,
  type Query,
} from '@tanstack/react-query';
import type { Persister } from '@tanstack/react-query-persist-client';

export const DISTRIBUTION_DAY_DETAILS_QUERY_ROOT =
  'distribution-day-details' as const;

export const QUERY_CACHE_STORAGE_KEY =
  'giving-day-distribution-day-query-cache';

export const QUERY_PERSIST_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function distributionDayDetailsQueryKey(
  dayId: string
): readonly [typeof DISTRIBUTION_DAY_DETAILS_QUERY_ROOT, string] {
  return [DISTRIBUTION_DAY_DETAILS_QUERY_ROOT, dayId];
}

export function isDistributionDayDetailsQueryKey(
  queryKey: readonly unknown[]
): boolean {
  return queryKey[0] === DISTRIBUTION_DAY_DETAILS_QUERY_ROOT;
}

export function shouldPersistDistributionDayDetailsQuery(
  query: Query
): boolean {
  return (
    defaultShouldDehydrateQuery(query) &&
    isDistributionDayDetailsQueryKey(query.queryKey)
  );
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 10_000,
        gcTime: QUERY_PERSIST_MAX_AGE_MS,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function createDistributionDayPersister(throttleTime = 1000): Persister {
  return createSyncStoragePersister({
    storage: window.localStorage,
    key: QUERY_CACHE_STORAGE_KEY,
    throttleTime,
  });
}

export function shouldDehydrateMutation(): boolean {
  return false;
}
