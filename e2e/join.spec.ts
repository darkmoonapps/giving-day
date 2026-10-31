import { test, expect } from '@playwright/test';
import {
  stubAuthenticatedSession,
  stubGoogleOAuthRedirect,
  stubJoinLinkApi,
  stubOnboardingSubmit,
} from './auth-stubs';

const JOIN_PATH = '/join/fake-join-token';

test.describe('City join link', () => {
  test('shows Holon, Install app, and Google login for a visitor', async ({
    page,
  }) => {
    await stubJoinLinkApi(page);

    await page.goto(JOIN_PATH);

    await expect(page.getByTestId('join-page')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'הצטרפות לחולון' })
    ).toBeVisible();
    await expect(page.getByTestId('install-app')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'המשך עם Google' })
    ).toBeVisible();
    await expect(page.getByTestId('login-page')).toHaveCount(0);
  });

  test('shows an invalid state for a revoked token', async ({ page }) => {
    await stubJoinLinkApi(page, { preview: 'not_found' });

    await page.goto(JOIN_PATH);

    await expect(page.getByTestId('join-invalid')).toBeVisible();
  });

  test('redeems after login and shows waiting for coordinator approval', async ({
    page,
  }) => {
    await stubJoinLinkApi(page);
    await stubAuthenticatedSession(page, { onboarded: true });

    await page.goto(JOIN_PATH);

    await expect(page.getByTestId('join-waiting')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'ממתינים לאישור הרכזת' })
    ).toBeVisible();
    await expect(page.getByTestId('home-page')).toHaveCount(0);
  });

  test('keeps the join token through Google login and onboarding', async ({
    page,
  }) => {
    await page.context().grantPermissions(['notifications'], {
      origin: 'http://localhost:3000',
    });
    await stubJoinLinkApi(page);
    await stubGoogleOAuthRedirect(page, '/onboarding');

    await page.goto(JOIN_PATH);
    await expect(page.getByTestId('join-page')).toBeVisible();

    await stubAuthenticatedSession(page, {
      onboarded: false,
      firstName: null,
      lastName: null,
      phone: null,
    });
    await stubOnboardingSubmit(page);

    await page.getByRole('button', { name: 'המשך עם Google' }).click();
    await expect(page.getByTestId('onboarding-page')).toBeVisible();

    await page.locator('input[name="firstName"]').fill('Noa');
    await page.locator('input[name="lastName"]').fill('Cohen');
    await page.locator('input[name="phone"]').fill('050-1234567');
    await page
      .getByTestId('onboarding-page')
      .locator('button[type="submit"]')
      .click();

    await expect(page.getByTestId('join-waiting')).toBeVisible();
    await expect(page).toHaveURL(/\/join\/fake-join-token/);
    await expect(page.getByTestId('home-page')).toHaveCount(0);
  });
});
