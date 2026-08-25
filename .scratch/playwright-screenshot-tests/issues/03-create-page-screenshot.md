# 03: Create page screenshot

**What to build:** A full-page screenshot assertion on the empty create form, added to the existing `postponement-creation.e2e.ts` test, so that visual regressions on the creation form are caught in CI.

**Blocked by:** 01 (Playwright screenshot config).

**Status:** ready-for-agent

- [ ] In `postponement-creation.e2e.ts`, add `await expect(page).toHaveScreenshot({ name: 'create', fullPage: true })` to the `should pass accessibility on create and edit pages` test, after the `checkA11y()` call on the create page (before any fields are filled)
- [ ] Generate the baseline PNG via `--update-snapshots`
- [ ] Verify the test passes with `playwright test e2e-tests/postponement-creation.e2e.ts`
