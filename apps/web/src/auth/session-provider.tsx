import {
  isUserOnboarded,
  type AuthUser,
  type OnboardingRequest,
} from '@giving-day/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ApiError } from '../api/mutator';
import { clearAccessToken } from './access-token';
import {
  completeOnboarding as completeOnboardingRequest,
  getCurrentUser,
  logoutSession,
  refreshSession,
} from './auth-api';

export type SessionStatus =
  'loading' | 'anonymous' | 'needs_onboarding' | 'ready';

export interface SessionContextValue {
  status: SessionStatus;
  user: AuthUser | null;
  error: 'session_error' | null;
  bootstrap: () => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: (input: OnboardingRequest) => Promise<AuthUser>;
  markReady: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function statusForUser(user: AuthUser): SessionStatus {
  return isUserOnboarded(user) ? 'ready' : 'needs_onboarding';
}

export function SessionProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<'session_error' | null>(null);

  const bootstrap = useCallback(async (): Promise<void> => {
    setStatus('loading');
    setError(null);

    try {
      await refreshSession();
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setStatus(statusForUser(currentUser));
    } catch (caught: unknown) {
      clearAccessToken();
      setUser(null);
      if (caught instanceof ApiError && caught.status === 401) {
        setStatus('anonymous');
        return;
      }
      setStatus('anonymous');
      setError('session_error');
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const logout = useCallback(async (): Promise<void> => {
    await logoutSession();
    setUser(null);
    setStatus('anonymous');
    setError(null);
  }, []);

  const completeOnboarding = useCallback(
    async (input: OnboardingRequest): Promise<AuthUser> => {
      const updatedUser = await completeOnboardingRequest(input);
      setUser(updatedUser);
      return updatedUser;
    },
    []
  );

  const markReady = useCallback((): void => {
    setStatus('ready');
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      user,
      error,
      bootstrap,
      logout,
      completeOnboarding,
      markReady,
    }),
    [status, user, error, bootstrap, logout, completeOnboarding, markReady]
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (value === null) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return value;
}
