import { defineConfig, devices } from '@playwright/test';

// The e2e suite runs against its own dedicated server instance on a separate
// port so it never reuses (and is never polluted by) a developer's
// `npm run dev` server on the default port 3000. Playwright always starts this
// server itself with the CLICK_TT_FIXTURES_DIR env set, which guarantees the
// server-side click-tt.ch scraping is served from the deterministic local HTML
// fixtures. This keeps every test independent and reproducible even when run
// one-by-one (e.g. via the IDE) while a dev server is running.
const E2E_HOSTNAME = 'game-scheduler.localhost';
const E2E_PORT = '3001';
const E2E_BASE_URL = `https://${E2E_HOSTNAME}:${E2E_PORT}`;

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
  // No global timeout: the former 15s budget for the *entire* run was far too
  // small (the suite alone already runs ~10s headless) and only caused
  // false "Timed out waiting 15s for the entire test run" failures on slower
  // machines / under contention.
  use: {
    baseURL: E2E_BASE_URL,
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
      APP_HOSTNAME: E2E_HOSTNAME,
      APP_PORT: E2E_PORT,
      // Serve downloaded HTML fixtures instead of hitting the live click-tt.ch
      // site so the scraping flow can be tested offline and deterministically.
      CLICK_TT_FIXTURES_DIR: './src/lib/__fixtures__',
    },
    ignoreHTTPSErrors: true,
    command: 'tsx src/index.ts',
    url: E2E_BASE_URL,
    reuseExistingServer: !process.env['CI'],
    gracefulShutdown: {signal: 'SIGTERM', timeout: 5000},
  },
});
