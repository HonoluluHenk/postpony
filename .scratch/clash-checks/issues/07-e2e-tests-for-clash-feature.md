# 07: E2E tests for the clash feature

**What to build:** Full-flow browser tests: an owner scrapes a match from click-tt (fixture mode), proposes dates, and sees Clash lines on both the edit page and the vote page; a hand-entered match shows "not checked" on both pages. At least one likely error path (scrape failure degrading gracefully) is covered.

**Blocked by:** 04

**Status:** done

- [x] Happy path: scrape-created match with proposed dates shows clash info on edit and vote pages
- [x] Hand-entered match shows "not checked" on both pages
- [x] A failed schedule check degrades gracefully without breaking the flow

## Implementation notes

- New spec: `e2e-tests/clash-checks.e2e.ts` (2 tests). Happy path scrapes
  Thun vs Ostermundigen (fixture mode), proposes `2026-12-04T18:00` (clashes
  with Thun vs Burgdorf 19:30, chip "Home: 7:30 PM vs Burgdorf") and
  `2026-10-10T18:00` (clean, chip "Schedule checked, no clashes"), asserts
  both chips on the edit page and the vote page (away/organizer side), and
  checks the refresh action is present. Hand-entered path asserts "Not
  checked" on both pages and the absence of the refresh action.
- Failed-check degradation: NOT e2e-testable in this worktree. The Playwright
  `webServer.env` (playwright.config.ts, off-limits here) pins
  `APP_CLICK_TT_FIXTURES_DIR` to the complete fixtures dir, and Playwright
  offers no per-test webServer env override — no request can hit a missing
  fixture file. Attempted alternatives (per-project webServer, env in
  `test.use`, browser `page.route`) cannot affect the server-side scrape.
  Covered instead by handler-level unit tests
  (`edit-handlers.spec.ts`: "a failed scrape leaves the date clash-free but
  still saves and renders", generator-run variant) plus
  `computeClashesForSession`'s catch-all in `proposed-dates-post.ts`. The
  limitation is documented in the spec file's header comment.