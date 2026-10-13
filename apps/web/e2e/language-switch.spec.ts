import { expect, test } from '@playwright/test';

test('switches the document from Hebrew RTL to English LTR', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('lang', 'he');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(
    page.getByRole('heading', { name: 'ברוכים הבאים ליום הנתינה' })
  ).toBeVisible();

  await page.getByRole('button', { name: 'English' }).click();

  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(
    page.getByRole('heading', { name: 'Welcome to Giving Day' })
  ).toBeVisible();

  await page.getByRole('button', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute(
    'data-mantine-color-scheme',
    'dark'
  );
});
