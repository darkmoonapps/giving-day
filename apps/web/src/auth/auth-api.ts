import {
  meResponseSchema,
  onboardingRequestSchema,
  type AuthUser,
  type OnboardingRequest,
} from '@giving-day/shared';
import {
  getAuthControllerCompleteOnboardingUrl,
  getAuthControllerGetCurrentUserUrl,
  getAuthControllerLogoutUrl,
} from '../api/generated/api';
import {
  ApiError,
  apiFetch,
  refreshAccessTokenFromCookie,
} from '../api/mutator';
import { clearAccessToken } from './access-token';

export async function refreshSession(): Promise<string> {
  const accessToken = await refreshAccessTokenFromCookie();
  if (accessToken === null) {
    throw new ApiError(401, 'HTTP 401');
  }
  return accessToken;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const payload = await apiFetch<unknown>(
    getAuthControllerGetCurrentUserUrl(),
    { method: 'GET' }
  );
  return meResponseSchema.parse(payload).user;
}

export async function completeOnboarding(
  input: OnboardingRequest
): Promise<AuthUser> {
  const body = onboardingRequestSchema.parse(input);
  const payload = await apiFetch<unknown>(
    getAuthControllerCompleteOnboardingUrl(),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );
  return meResponseSchema.parse(payload).user;
}

export async function logoutSession(): Promise<void> {
  try {
    await apiFetch<void>(getAuthControllerLogoutUrl(), {
      method: 'POST',
      skipAuthRefresh: true,
    });
  } finally {
    clearAccessToken();
  }
}
