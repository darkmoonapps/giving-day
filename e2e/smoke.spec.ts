import { test, expect } from '@playwright/test';

test.describe('Smoke Test', () => {
  test('should load the homepage in Hebrew RTL by default', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'he');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(
      page.getByRole('heading', { name: 'ברוכים הבאים ליום הנתינה' })
    ).toBeVisible();
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
  });

  test('should switch from Hebrew RTL to English LTR', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'English' }).click();

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(
      page.getByRole('heading', { name: 'Welcome to Giving Day' })
    ).toBeVisible();
  });

  test('should persist a dark color scheme choice', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'כהה' }).click();
    await expect(page.locator('html')).toHaveAttribute(
      'data-mantine-color-scheme',
      'dark'
    );
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
