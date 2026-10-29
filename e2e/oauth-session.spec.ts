import { test, expect } from '@playwright/test';
import {
  stubAuthenticatedSession,
  stubGoogleOAuthRedirect,
} from './auth-stubs';

test.describe('OAuth session after Google callback', () => {
  test('keeps a new user on onboarding instead of bouncing to login', async ({
    page,
  }) => {
    await stubAuthenticatedSession(page, { onboarded: false });

    await page.goto('/auth/callback');

    await expect(page.getByTestId('onboarding-page')).toBeVisible();
    await expect(page.getByTestId('login-page')).toHaveCount(0);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('sends an onboarded user home instead of bouncing to login', async ({
    page,
  }) => {
    await stubAuthenticatedSession(page, { onboarded: true });

    await page.goto('/auth/callback');

    await expect(page.getByTestId('home-page')).toBeVisible();
    await expect(page.getByTestId('login-page')).toHaveCount(0);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('keeps a new user on the API onboarding redirect', async ({ page }) => {
    await stubAuthenticatedSession(page, { onboarded: false });

    await page.goto('/onboarding');

    await expect(page.getByTestId('onboarding-page')).toBeVisible();
    await expect(page.getByTestId('login-page')).toHaveCount(0);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('does not return to login after a stubbed Google login', async ({
    page,
  }) => {
    await stubGoogleOAuthRedirect(page, '/onboarding');

    await page.goto('/login');
    await expect(page.getByTestId('login-page')).toBeVisible();

    await stubAuthenticatedSession(page, { onboarded: false });
    await page.getByRole('button', { name: 'המשך עם Google' }).click();

    await expect(page.getByTestId('onboarding-page')).toBeVisible();
    await expect(page.getByTestId('login-page')).toHaveCount(0);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('still sends visitors to login when the callback has no session', async ({
    page,
  }) => {
    await page.goto('/auth/callback');

    await expect(page.getByTestId('login-page')).toBeVisible();
    await expect(page.getByTestId('onboarding-page')).toHaveCount(0);
    await expect(page.getByTestId('home-page')).toHaveCount(0);
  });
});
