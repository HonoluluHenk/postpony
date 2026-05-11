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
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'tsx src/index.ts',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env['CI'],
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 },
  },
});
