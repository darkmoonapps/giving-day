import { test, expect } from '@playwright/test';

test.describe('Smoke Test', () => {
  test('should load the homepage and display the title', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('text=Giving Day')).toBeVisible();
    await expect(page.locator('text=Welcome to Giving Day')).toBeVisible();
  });

  test('should display the system status card', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('text=System Status')).toBeVisible();
    await expect(page.locator('text=API Status:')).toBeVisible();
  });

  test('should display the about section', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('text=About')).toBeVisible();
    await expect(
      page.locator(
        'text=This app helps manage volunteers for monthly food-package'
      )
    ).toBeVisible();
  });
});
