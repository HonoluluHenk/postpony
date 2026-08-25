# 04: Edit page screenshots

**What to build:** Full-page screenshot tests for the edit page in four states — empty, with proposed dates, with player votes, and confirmed — baselined and committed to git, so that visual regressions across the entire editing workflow are caught in CI.

**Blocked by:** 01 (Playwright screenshot config).

**Status:** ready-for-agent

- [ ] Create `e2e-tests/screenshots/edit.e2e.ts` importing `test` and `expect` from the shared fixtures
- [ ] **Empty state**: create a session via `EditPage.createSession()` with no dates, assert full-page screenshot (`edit-empty`)
- [ ] **With dates**: create a session with two proposed dates via `EditPage.createSession(page, [date1, date2])`, assert full-page screenshot (`edit-with-dates`)
- [ ] **With votes**: create a session with dates, join as a player via the join page using the home invite link, cast votes, reload the edit page, assert full-page screenshot (`edit-with-votes`)
- [ ] **Confirmed**: create a session with dates, confirm the first date via `editPage.confirmDate(0)`, assert full-page screenshot (`edit-confirmed`)
- [ ] Generate and commit all four baseline PNGs
- [ ] Verify all four tests pass with `playwright test e2e-tests/screenshots/edit.e2e.ts`
