import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { stubAuthenticatedSession, stubDistributionDayApi } from './auth-stubs';

const CITY_A_ID = '11111111-1111-4111-8111-111111111111';
const DAY_ID = '33333333-3333-4333-8333-333333333333';

test.describe('Accessibility sanity', () => {
  test('login screen has no serious axe violations in Hebrew RTL', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('login-page')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('link', { name: 'דלג לתוכן' })).toBeAttached();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('login screen stays clean after switching to English LTR', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'English' }).click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Skip to content' })
    ).toBeAttached();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('volunteer day confirmation screen has no serious axe violations', async ({
    page,
  }) => {
    await stubAuthenticatedSession(page, {
      onboarded: true,
      memberships: [{ cityId: CITY_A_ID, role: 'volunteer', status: 'active' }],
    });
    await stubDistributionDayApi(page);

    await page.goto(`/cities/${CITY_A_ID}/days/${DAY_ID}`);
    await expect(page.getByTestId('volunteer-day-page')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
