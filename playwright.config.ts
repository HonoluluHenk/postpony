import { defineConfig, devices } from '@playwright/test';

//noinspection JSUnusedGlobalSymbols
export default defineConfig({
  testDir: './e2e-tests',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: [['html', {open: 'never'}]],
  timeout: 10 * 1000,
  globalTimeout: 15 * 1000,
  use: {
    baseURL: 'https://game-scheduler.localhost:3000',
    trace: 'on-first-retry',
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'chromium',
      use: {...devices['Desktop Chrome']},
    },
  ],
  webServer: {
    env: {
      //APP_HOSTNAME: 'localhost',
      //APP_PORT: '3001',
    },
    ignoreHTTPSErrors: true,
    command: 'tsx src/index.ts',
    url: 'https://game-scheduler.localhost:3000',
    reuseExistingServer: !process.env['CI'],
    gracefulShutdown: {signal: 'SIGTERM', timeout: 5000},
  },
});
