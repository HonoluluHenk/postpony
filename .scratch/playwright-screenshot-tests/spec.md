# Spec: Playwright Screenshot Tests for Visual Regression

Status: ready-for-agent

## Problem Statement

The e2e suite covers behavioural correctness (navigation, form submission, voting, a11y) but has no visual regression detection. A CSS change, a BeerCSS upgrade, or a layout tweak can silently break the visual appearance of any page — wrong spacing, misaligned elements, broken card layouts, invisible buttons — and ship undetected. The existing responsive test checks DOM metrics (bounding boxes, scroll dimensions) and the a11y tests check programmatic accessibility, but neither catches what the page actually looks like.

## Solution

Add Playwright screenshot tests using `toHaveScreenshot()` to capture full-page screenshots of every page in its key states. Baseline images are committed to git; CI compares against them and fails on visual drift. Tests live in a dedicated `e2e-tests/screenshots/` directory, one file per page, using the existing page object seam for navigation and state setup.

## User Stories

1. As a maintainer, I want the start page captured as a full-page screenshot, so that visual regressions on the landing page are caught.
2. As a maintainer, I want the create page captured as a full-page screenshot, so that visual regressions on the creation form are caught.
3. As a maintainer, I want the edit page captured in its empty state (freshly created session, no dates, no players), so that the base editing layout is baselined.
4. As a maintainer, I want the edit page captured after adding proposed dates, so that the date list layout is baselined.
5. As a maintainer, I want the edit page captured after a player has voted, so that the tally/vote display is baselined.
6. As a maintainer, I want the edit page captured after a date is confirmed, so that the confirmed-state layout is baselined.
7. As a maintainer, I want the join page captured as a full-page screenshot, so that visual regressions on the voting/join flow are caught.
8. As a developer, I want screenshot tests in a dedicated directory, so that I can run them independently from behavioural tests.
9. As a developer, I want each screenshot test to use the existing page object methods for state setup, so that no new interaction helpers are needed.
10. As a developer, I want `toHaveScreenshot()` with a configurable pixel-diff threshold, so that sub-pixel rendering jitter does not cause false failures.
11. As a developer, I want baseline screenshots committed to git, so that CI has a known-good reference to compare against.
12. As a developer, I want full-page screenshots (`fullPage: true`), so that below-fold layout is captured.
13. As a developer, I want a single Desktop Chrome viewport for screenshot tests, so that the baseline set stays small and maintainable.
14. As a developer, I want screenshot tests to be purely visual — no a11y assertions — so that failure signals are unambiguous.
15. As a developer, I want the screenshot directory excluded from the upload/build output, so that baseline PNGs never ship to production.
16. As a maintainer, I want the Playwright config to carry a default `maxDiffPixelRatio` for screenshot comparisons, so that threshold tuning happens in one place.
17. As a developer, I want each screenshot test file to import `test` and `expect` from the shared fixtures, so that the custom fixture pattern is consistent across all e2e tests.
18. As a developer, I want screenshot test basenames to encode the page and state (e.g., `edit-empty`, `edit-with-dates`), so that the generated baseline files are self-documenting.
19. As a maintainer, I want the `npm run clean` script to not delete baseline screenshots, so that local dev iterations are not disrupted.
20. As a contributor, I want a clear visual diff on test failure (Playwright's built-in diff image), so that I can identify what changed without manually comparing PNGs.

## Implementation Decisions

**Decision one: page object seam.**

All screenshot tests navigate and set up state through the existing page objects (`StartPage`, `CreatePage`, `EditPage`, `JoinPage`). No new seam is introduced. The test for each page:

1. Instantiates the relevant page object.
2. Calls its navigation method (`goto()`).
3. For multi-state pages, calls existing methods to reach the target state (e.g., `EditPage.createSession()` then `editPage.addProposedDate()`).
4. Calls `expect(page).toHaveScreenshot({ name: '...', fullPage: true })`.

This keeps the screenshot tests thin — they are assertions over visual output, not interaction logic.

**Decision two: edit page states.**

The edit page is the richest page, accumulating state as the owner interacts. Four states are captured:

- **Empty**: freshly created session via `EditPage.createSession()`, no proposed dates, no players. Basename: `edit-empty`.
- **With dates**: session created with two proposed dates via `EditPage.createSession(page, [date1, date2])`. Basename: `edit-with-dates`.
- **With votes**: session created with dates, then a player joins via the join page and casts votes, then the edit page is reloaded. Basename: `edit-with-votes`.
- **Confirmed**: session created with dates, then `editPage.confirmDate(0)` is called. Basename: `edit-confirmed`.

Other pages (start, create, join) are single-state — one screenshot each of their initial rendered state.

**Decision three: comparison method.**

Use `toHaveScreenshot()` (pixel-level comparison with diff image on failure) rather than `toMatchSnapshot()` (binary hash, no diff view). The default `maxDiffPixelRatio` is set in `playwright.config.ts` and inherited by all screenshot tests. The threshold handles sub-pixel rendering jitter from the deterministic fixture system.

**Decision four: file organisation.**

Screenshot tests live in `e2e-tests/screenshots/`, one file per page:

- `start.e2e.ts`
- `create.e2e.ts`
- `edit.e2e.ts` (four `test()` calls, one per state)
- `join.e2e.ts`

This isolates visual tests from behavioural tests and allows independent execution via `playwright test e2e-tests/screenshots`.

**Decision five: baseline management.**

Baseline screenshots are generated on first run and stored alongside the test files (Playwright's default behaviour). They are committed to git so CI can compare against known-good references. The `test-results/` and `playwright-report/` directories remain gitignored (they contain transient artifacts, not baselines).

**Decision six: no new npm scripts.**

The existing `npm run e2e` / `playwright test e2e-tests` already discovers `*.e2e.ts` files recursively, so the new `e2e-tests/screenshots/*.e2e.ts` files are picked up automatically. No new script is needed. Developers who want to run only screenshot tests can use `playwright test e2e-tests/screenshots`.

## Testing Decisions

**What makes a good test here.** Each test navigates to a page, sets up a deterministic state via page objects, and asserts that the full-page screenshot matches the baseline. The test should not assert implementation details (CSS classes, DOM structure) — only the visual output. A good test is one that fails when the page looks different, and passes when it looks the same.

**Seam.** One seam, existing: the page object layer. Every screenshot test uses page objects for navigation and state setup. The assertion is a single `toHaveScreenshot()` call per state.

**Modules under test.** The SSR-rendered pages: start, create, edit (four states), join. The visual output of each page is the unit under test.

**Scenarios.**

- Start page: navigate to `/`, capture full-page screenshot.
- Create page: navigate to `/create`, capture full-page screenshot of the empty form.
- Edit page empty: create a session via `EditPage.createSession()`, capture before adding any dates.
- Edit page with dates: create a session with two proposed dates, capture after dates appear in the list.
- Edit page with votes: create a session with dates, join as a player via the join page, cast votes, reload the edit page, capture the tally display.
- Edit page confirmed: create a session with dates, confirm the first date, capture the confirmed state.
- Join page: navigate to a join URL (home team invite link), capture the join form before identification.

**Prior art.** The existing e2e suite provides the page object pattern, the custom fixtures (`checkA11y`, `makeAxeBuilder`), and the session creation helpers (`EditPage.createSession`). The screenshot tests follow the same import conventions (`import { test, expect } from '../fixtures'`) and the same page object instantiation pattern.

**Gates.** Lint (type-check, e2e type-check, ESLint) must pass before screenshot tests run. The screenshot tests are included in the existing `npm run e2e` gate. On first run, `--update-snapshots` generates baselines; subsequent runs compare against them.

## Out of Scope

- Multiple viewports (mobile, tablet) — the existing `responsive.e2e.ts` covers multi-viewport via DOM assertions.
- Screenshot tests for the scrape wizard — it has complex multi-step interaction and is lower priority; can be added later.
- Visual regression testing for CSS-only changes in isolation (no page navigation).
- Replacing or modifying the existing a11y tests.
- Changes to the Playwright config's server setup, project definition, or web server configuration.
- Changes to existing page objects or behavioural test files.
- New npm scripts or CI pipeline changes beyond what `npm run e2e` already covers.
- Dynamic content masking — the deterministic fixture system makes masking unnecessary.

## Further Notes

- The "with votes" edit-page state requires cross-page interaction: a session is created via the edit page, then a player joins via the join page and casts votes, then the edit page is reloaded. This is the most complex setup but uses only existing page object methods.
- Baseline PNGs will be relatively large files. The `e2e-tests/screenshots/` directory should be kept small by limiting the number of states per page.
- The `toHaveScreenshot()` default comparison is pixel-by-pixel with an anti-aliasing aware algorithm. The `maxDiffPixelRatio` threshold in the Playwright config provides a single tuning knob.
- This spec does not require an ADR: screenshot testing is a natural extension of the existing Playwright e2e strategy (ADR 0005), not a new architectural decision.
