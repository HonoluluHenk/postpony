# 02: Start page screenshot

**What to build:** A full-page screenshot test for the start page landing state, baselined and committed to git, so that visual regressions on the landing page are caught in CI.

**Blocked by:** 01 (Playwright screenshot config).

**Status:** ready-for-agent

- [ ] Create `e2e-tests/screenshots/start.e2e.ts` importing `test` and `expect` from the shared fixtures
- [ ] Navigate to the start page via `StartPage.goto()`
- [ ] Assert a full-page screenshot matches the baseline using `toHaveScreenshot()`
- [ ] Generate and commit the baseline PNG
- [ ] Verify the test passes with `playwright test e2e-tests/screenshots/start.e2e.ts`
