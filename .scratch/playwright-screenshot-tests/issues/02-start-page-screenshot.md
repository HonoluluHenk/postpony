# 02: Start page screenshot

**What to build:** A full-page screenshot assertion on the start page landing state, added to the existing `start-page.e2e.ts` test, so that visual regressions on the landing page are caught in CI.

**Blocked by:** 01 (Playwright screenshot config).

**Status:** ready-for-agent

- [ ] In `start-page.e2e.ts`, add `await expect(page).toHaveScreenshot({ name: 'start', fullPage: true })` to the `accessibility landmarks check` test, after the existing `checkA11y()` call
- [ ] Ensure `page` is available in the test's fixture destructuring (add if missing)
- [ ] Generate the baseline PNG via `--update-snapshots`
- [ ] Verify the test passes with `playwright test e2e-tests/start-page.e2e.ts`
