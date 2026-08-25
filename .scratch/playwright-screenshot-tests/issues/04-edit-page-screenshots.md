# 04: Edit page screenshots

**What to build:** Full-page screenshot assertions on the edit page in four states — empty, with proposed dates, with player votes, and confirmed — added to existing tests in `postponement-editing.e2e.ts`, so that visual regressions across the entire editing workflow are caught in CI.

**Blocked by:** 01 (Playwright screenshot config).

**Status:** ready-for-agent

- [ ] **Empty state**: in `should maintain accessibility on the editing interface`, add `toHaveScreenshot({ name: 'edit-empty', fullPage: true })` after session creation (ensure `page` is in fixture destructuring)
- [ ] **With dates**: in `should add proposed postponement dates`, add `toHaveScreenshot({ name: 'edit-with-dates', fullPage: true })` after the date count assertion
- [ ] **With votes**: in `should show vote tallies on the edit page`, add `toHaveScreenshot({ name: 'edit-with-votes', fullPage: true })` after the tally assertions
- [ ] **Confirmed**: in `should confirm a proposed date, lock the session, and show the reopen control`, add `toHaveScreenshot({ name: 'edit-confirmed', fullPage: true })` after the post-confirmation assertions
- [ ] Generate all four baseline PNGs via `--update-snapshots`
- [ ] Verify all four tests pass with `playwright test e2e-tests/postponement-editing.e2e.ts`
