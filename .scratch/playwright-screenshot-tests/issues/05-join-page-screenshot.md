# 05: Join page screenshot

**What to build:** A full-page screenshot test for the join page (pre-identification form state), baselined and committed to git, so that visual regressions on the join/voting flow are caught in CI.

**Blocked by:** 01 (Playwright screenshot config).

**Status:** ready-for-agent

- [ ] Create `e2e-tests/screenshots/join.e2e.ts` importing `test` and `expect` from the shared fixtures
- [ ] Create a session with dates via `EditPage.createSession()` to obtain an invite link
- [ ] Navigate to the join page via `JoinPage.goto()` using the home invite link
- [ ] Assert a full-page screenshot matches the baseline using `toHaveScreenshot()`
- [ ] Generate and commit the baseline PNG
- [ ] Verify the test passes with `playwright test e2e-tests/screenshots/join.e2e.ts`
