import { defineConfig, devices } from '@playwright/test';

// Centralises env reads for this config file; keeps a single place to add
// defaults or validation if needed later.
function readEnv(name: string): string | undefined {
  //@ts-expect-error playwright automatically includes node types
  //eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
  return process.env[name];
}

// The e2e suite runs against its own dedicated server instance on a separate
// port so it never reuses (and is never polluted by) a developer's
// `npm run dev` server on the default port 3000. Playwright always starts this
// server itself with the APP_CLICK_TT_FIXTURES_DIR env set, which guarantees the
// server-side click-tt.ch scraping is served from the deterministic local HTML
// fixtures. This keeps every test independent and reproducible even when run
// one-by-one (e.g. via the IDE) while a dev server is running.
//
// The server port is configurable via the E2E_APP_PORT env var (read from the
// process environment, NOT from .env) so parallel agents can run e2e suites
// concurrently on distinct ports. It defaults to 3001.
const E2E_HOSTNAME = 'game-scheduler.localhost';
const E2E_PORT = readEnv('E2E_APP_PORT') ?? '3001';
const E2E_BASE_URL = `https://${E2E_HOSTNAME}:${E2E_PORT}`;

//noinspection JSUnusedGlobalSymbols
export default defineConfig({
  testDir: './e2e-tests',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!readEnv('CI'),
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
  expect: {
    toHaveScreenshot: {
      // 2 % tolerance for sub-pixel rendering jitter; tune in one place.
      maxDiffPixelRatio: 0.02,
    },
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
      APP_CLICK_TT_FIXTURES_DIR: './src/lib/__fixtures__',
    },
    ignoreHTTPSErrors: true,
    command: 'npm run start',
    url: E2E_BASE_URL,
    reuseExistingServer: false,
    gracefulShutdown: {signal: 'SIGTERM', timeout: 5000},
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
