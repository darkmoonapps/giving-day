import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.CI
    ? [
        {
          command: 'pnpm --filter @giving-day/api start',
          url: 'http://localhost:3001/api/health',
          timeout: 120 * 1000,
          reuseExistingServer: false,
        },
        {
          command:
            'pnpm --filter @giving-day/web preview --host 127.0.0.1 --strictPort',
          url: 'http://localhost:3000',
          timeout: 120 * 1000,
          reuseExistingServer: false,
        },
      ]
    : {
        command: 'pnpm dev',
        url: 'http://localhost:3000',
        timeout: 120 * 1000,
        reuseExistingServer: true,
      },
});
