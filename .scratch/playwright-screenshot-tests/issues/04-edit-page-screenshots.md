# 04: Edit page screenshots

**What to build:** Full-page screenshot assertions on the edit page in four states — empty, with proposed dates, with player votes, and confirmed — added to existing tests in `postponement-editing.e2e.ts`, so that visual regressions across the entire editing workflow are caught in CI.

**Blocked by:** 01 (Playwright screenshot config).

**Status:** done

- [x] **Empty state**: in `should maintain accessibility on the editing interface`, add `toHaveScreenshot('edit-empty.png', {fullPage: true})` after session creation (ensure `page` is in fixture destructuring)
- [x] **With dates**: in `should add proposed postponement dates`, add `toHaveScreenshot('edit-with-dates.png', {fullPage: true})` after the date count assertion
- [x] **With votes**: in `should show vote tallies on the edit page`, add `toHaveScreenshot('edit-with-votes.png', {fullPage: true})` after the tally assertions
- [x] **Confirmed**: in `should confirm a proposed date, lock the session, and show the reopen control`, add `toHaveScreenshot('edit-confirmed.png', {fullPage: true})` after the post-confirmation assertions
- [x] Generate all four baseline PNGs via `--update-snapshots`
- [x] Verify all four tests pass with `playwright test e2e-tests/postponement-editing.e2e.ts`
