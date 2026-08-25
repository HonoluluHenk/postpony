# 03: Create page screenshot

**What to build:** A full-page screenshot test for the create page (empty form state), baselined and committed to git, so that visual regressions on the creation form are caught in CI.

**Blocked by:** 01 (Playwright screenshot config).

**Status:** ready-for-agent

- [ ] Create `e2e-tests/screenshots/create.e2e.ts` importing `test` and `expect` from the shared fixtures
- [ ] Navigate to the create page via `CreatePage.goto()`
- [ ] Assert a full-page screenshot matches the baseline using `toHaveScreenshot()`
- [ ] Generate and commit the baseline PNG
- [ ] Verify the test passes with `playwright test e2e-tests/screenshots/create.e2e.ts`
