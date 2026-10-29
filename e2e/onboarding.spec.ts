import { test, expect, type Page } from '@playwright/test';
import { stubAuthenticatedSession, stubOnboardingSubmit } from './auth-stubs';

const newProfile = {
  onboarded: false as const,
  firstName: null,
  lastName: null,
  phone: null,
  birthDate: null,
};

async function fillRequiredOnboardingFields(page: Page): Promise<void> {
  await page.locator('input[name="firstName"]').fill('Noa');
  await page.locator('input[name="lastName"]').fill('Cohen');
  await page.locator('input[name="phone"]').fill('050-1234567');
}

test.describe('Onboarding save', () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['notifications'], {
      origin: 'http://localhost:3000',
    });
  });

  test('saves without a birth date and lands past onboarding', async ({
    page,
  }) => {
    const submitted: Record<string, unknown>[] = [];
    await stubAuthenticatedSession(page, newProfile);
    await stubOnboardingSubmit(page, (body) => {
      submitted.push(body);
    });

    await page.goto('/onboarding');
    await expect(page.getByTestId('onboarding-page')).toBeVisible();

    await fillRequiredOnboardingFields(page);
    await page
      .getByTestId('onboarding-page')
      .locator('button[type="submit"]')
      .click();

    await expect(page.getByTestId('home-page')).toBeVisible();
    await expect(page.getByTestId('onboarding-page')).toHaveCount(0);
    expect(submitted).toHaveLength(1);
    expect(submitted[0]).toMatchObject({
      firstName: 'Noa',
      lastName: 'Cohen',
      phone: '+972501234567',
    });
    expect(submitted[0]).not.toHaveProperty('birthDate');
  });

  test('saves with a birth date and lands past onboarding', async ({
    page,
  }) => {
    const submitted: Record<string, unknown>[] = [];
    await stubAuthenticatedSession(page, newProfile);
    await stubOnboardingSubmit(page, (body) => {
      submitted.push(body);
    });

    await page.goto('/onboarding');
    await expect(page.getByTestId('onboarding-page')).toBeVisible();

    await fillRequiredOnboardingFields(page);
    await page.locator('input[name="birthDate"]').fill('1990-03-15');
    await page
      .getByTestId('onboarding-page')
      .locator('button[type="submit"]')
      .click();

    await expect(page.getByTestId('home-page')).toBeVisible();
    await expect(page.getByTestId('onboarding-page')).toHaveCount(0);
    expect(submitted).toHaveLength(1);
    expect(submitted[0]).toMatchObject({
      firstName: 'Noa',
      lastName: 'Cohen',
      phone: '+972501234567',
      birthDate: '1990-03-15',
    });
  });
});
