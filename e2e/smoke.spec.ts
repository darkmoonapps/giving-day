import { test, expect } from '@playwright/test';

test.describe('Smoke Test', () => {
  test('should load the login screen in Hebrew RTL by default', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'he');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('heading', { name: 'התחברות' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'המשך עם Google' })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'המשך עם Facebook' })
    ).toBeVisible();
  });

  test('should switch from Hebrew RTL to English LTR', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'English' }).click();

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('should persist English LTR after reload', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'English' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await page.reload();

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('should persist a dark color scheme choice after reload in RTL', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'he');
    await expect(page.locator('html')).toHaveAttribute(
      'data-giving-day-theme',
      'wisteria-mint'
    );

    await page.getByRole('button', { name: 'כהה' }).click();
    await expect(page.locator('html')).toHaveAttribute(
      'data-mantine-color-scheme',
      'dark'
    );

    await page.reload();

    await expect(page.locator('html')).toHaveAttribute(
      'data-mantine-color-scheme',
      'dark'
    );
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'he');
    await expect(page.getByRole('heading', { name: 'התחברות' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'כהה' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  test('should keep the color scheme toggle usable in English LTR', async ({
    page,
  }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'English' }).click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await page.getByRole('button', { name: 'Dark' }).click();
    await expect(page.locator('html')).toHaveAttribute(
      'data-mantine-color-scheme',
      'dark'
    );
    await expect(page.getByRole('button', { name: 'Dark' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  test('should keep unauthenticated visitors on login', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('login-page')).toBeVisible();
    await expect(page.getByTestId('home-page')).toHaveCount(0);
    await expect(page.getByTestId('onboarding-page')).toHaveCount(0);
  });
});
