# 05: Join page screenshot

**What to build:** A full-page screenshot assertion on the join form before player identification, added to the existing `join-voting.e2e.ts` test, so that visual regressions on the join/voting flow are caught in CI.

**Blocked by:** 01 (Playwright screenshot config).

**Status:** done

- [x] In `join-voting.e2e.ts`, add `await expect(page).toHaveScreenshot({ name: 'join', fullPage: true })` to the `join and vote steps are accessible` test, after the heading assertion and `checkA11y()` call (before `joinPage.join()`)
- [x] Generate the baseline PNG via `--update-snapshots`
- [x] Verify the test passes with `playwright test e2e-tests/join-voting.e2e.ts`
