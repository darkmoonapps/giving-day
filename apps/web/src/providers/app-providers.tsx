import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppThemeProvider } from '@giving-day/ui';
import { useState, type ReactNode } from 'react';
import { useUiStore } from '../stores/ui-store';
import { DirectionSync } from './direction-sync';

export interface AppProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 10_000,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function AppProviders({
  children,
  queryClient,
}: AppProvidersProps): JSX.Element {
  const [client] = useState<QueryClient>(
    () => queryClient ?? createQueryClient()
  );
  const colorScheme = useUiStore((state) => state.colorScheme);

  return (
    <QueryClientProvider client={client}>
      <AppThemeProvider
        defaultColorScheme="auto"
        forceColorScheme={colorScheme === 'auto' ? undefined : colorScheme}
      >
        <DirectionSync />
        {children}
      </AppThemeProvider>
    </QueryClientProvider>
  );
}
