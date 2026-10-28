import { QueryClient } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { SessionProvider } from '../auth/session-provider';
import { AppProviders } from '../providers/app-providers';
import { AppRoutes } from '../routing/app-routes';

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

export function renderWithProviders(
  ui: ReactElement,
  queryClient: QueryClient = createTestQueryClient()
): RenderResult {
  return render(<AppProviders queryClient={queryClient}>{ui}</AppProviders>);
}

export function renderApp(
  route = '/login',
  queryClient: QueryClient = createTestQueryClient()
): RenderResult {
  return render(
    <AppProviders queryClient={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </MemoryRouter>
    </AppProviders>
  );
}
