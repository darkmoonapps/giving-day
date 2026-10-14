import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { AppThemeProvider } from '@giving-day/ui';
import { useState, type ReactNode } from 'react';
import {
  createDistributionDayPersister,
  createQueryClient,
  QUERY_PERSIST_MAX_AGE_MS,
  shouldDehydrateMutation,
  shouldPersistDistributionDayDetailsQuery,
} from '../api/query-persistence';
import { UnexpectedError } from '../components/unexpected-error';
import { SentryErrorBoundary } from '../sentry-error-boundary';
import { useUiStore } from '../stores/ui-store';
import { DirectionSync } from './direction-sync';

export interface AppProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

export function AppProviders({
  children,
  queryClient,
}: AppProvidersProps): JSX.Element {
  const [client] = useState<QueryClient>(
    () => queryClient ?? createQueryClient()
  );
  const [persister] = useState(() =>
    queryClient === undefined ? createDistributionDayPersister() : null
  );
  const colorScheme = useUiStore((state) => state.colorScheme);

  const themedChildren = (
    <AppThemeProvider
      defaultColorScheme="auto"
      forceColorScheme={colorScheme === 'auto' ? undefined : colorScheme}
    >
      <DirectionSync />
      <SentryErrorBoundary
        fallback={({ resetError }) => <UnexpectedError onReset={resetError} />}
      >
        {children}
      </SentryErrorBoundary>
    </AppThemeProvider>
  );

  if (persister === null) {
    return (
      <QueryClientProvider client={client}>
        {themedChildren}
      </QueryClientProvider>
    );
  }

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        maxAge: QUERY_PERSIST_MAX_AGE_MS,
        dehydrateOptions: {
          shouldDehydrateQuery: shouldPersistDistributionDayDetailsQuery,
          shouldDehydrateMutation,
        },
      }}
    >
      {themedChildren}
    </PersistQueryClientProvider>
  );
}
