import {
  getAuthControllerFacebookLoginUrl,
  getAuthControllerGoogleLoginUrl,
} from '../api/generated/api';
import { resolveApiUrl } from '../api/mutator';

export type OAuthProvider = 'google' | 'facebook';

export function getOAuthStartUrl(provider: OAuthProvider): string {
  const path =
    provider === 'google'
      ? getAuthControllerGoogleLoginUrl()
      : getAuthControllerFacebookLoginUrl();
  return resolveApiUrl(path);
}

export function startOAuthLogin(provider: OAuthProvider): void {
  window.location.assign(getOAuthStartUrl(provider));
}
