# 01: Playwright screenshot config

**What to build:** Add `toHaveScreenshot` defaults to the Playwright configuration so that all screenshot comparisons use a single, tunable pixel-diff threshold. The existing e2e suite continues to pass unchanged.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Add a `toHaveScreenshot` default configuration to `playwright.config.ts` with an appropriate `maxDiffPixelRatio` threshold
- [x] Ensure existing `npm run e2e` still passes with no regressions
- [x] Verify that `playwright test --update-snapshots` mode is not affected by the new defaults
