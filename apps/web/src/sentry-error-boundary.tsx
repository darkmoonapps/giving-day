import { ErrorBoundary, type FallbackRender } from '@sentry/react';
import type { ReactNode } from 'react';

export interface SentryErrorBoundaryFallbackProps {
  resetError: () => void;
}

export interface SentryErrorBoundaryProps {
  children: ReactNode;
  fallback: (props: SentryErrorBoundaryFallbackProps) => JSX.Element;
}

export function SentryErrorBoundary({
  children,
  fallback,
}: SentryErrorBoundaryProps): JSX.Element {
  const renderFallback: FallbackRender = (errorData) =>
    fallback({ resetError: errorData.resetError });

  return <ErrorBoundary fallback={renderFallback}>{children}</ErrorBoundary>;
}
