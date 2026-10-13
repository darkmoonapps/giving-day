import { test, expect } from '@playwright/test';

// TODO: Once i18n lands (frontend-foundations PR), test both Hebrew and English locales

test.describe('Smoke Test', () => {
  test('should load the homepage and display headings', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
  });

  test('should display healthy system status', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 3 })).toBeVisible();

    const statusBadge = page.getByTestId('status-badge');
    await expect(statusBadge).toBeVisible();
    await expect(statusBadge).toHaveAttribute('data-status', 'healthy');

    const databaseBadge = page.getByTestId('database-badge');
    await expect(databaseBadge).toBeVisible();
    await expect(databaseBadge).toHaveAttribute('data-connected', 'true');
  });

  test('should display the about section', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 4 })).toBeVisible();
  });
});
