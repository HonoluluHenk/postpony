# Spec: Playwright Screenshot Tests for Visual Regression

Status: ready-for-agent

## Problem Statement

The e2e suite covers behavioural correctness (navigation, form submission, voting, a11y) but has no visual regression detection. A CSS change, a BeerCSS upgrade, or a layout tweak can silently break the visual appearance of any page — wrong spacing, misaligned elements, broken card layouts, invisible buttons — and ship undetected. The existing responsive test checks DOM metrics (bounding boxes, scroll dimensions) and the a11y tests check programmatic accessibility, but neither catches what the page actually looks like.

## Solution

Add `toHaveScreenshot()` calls to the existing Playwright e2e tests at key state checkpoints. Each existing test already sets up the page state needed for a screenshot — adding a single assertion at the right moment captures the visual baseline with zero duplicated setup. Baseline images are committed to git; CI compares against them and fails on visual drift.

## User Stories

1. As a maintainer, I want the start page captured as a full-page screenshot, so that visual regressions on the landing page are caught.
2. As a maintainer, I want the create page captured as a full-page screenshot, so that visual regressions on the creation form are caught.
3. As a maintainer, I want the edit page captured in its empty state (freshly created session, no dates, no players), so that the base editing layout is baselined.
4. As a maintainer, I want the edit page captured after adding proposed dates, so that the date list layout is baselined.
5. As a maintainer, I want the edit page captured after a player has voted, so that the tally/vote display is baselined.
6. As a maintainer, I want the edit page captured after a date is confirmed, so that the confirmed-state layout is baselined.
7. As a maintainer, I want the join page captured as a full-page screenshot, so that visual regressions on the voting/join flow are caught.
8. As a developer, I want screenshot assertions co-located with the behavioural tests that set up the same state, so that related assertions live together and no setup is duplicated.
9. As a developer, I want each screenshot assertion to use the existing page object methods already in the test, so that no new interaction helpers are needed.
10. As a developer, I want `toHaveScreenshot()` with a configurable pixel-diff threshold, so that sub-pixel rendering jitter does not cause false failures.
11. As a developer, I want baseline screenshots committed to git, so that CI has a known-good reference to compare against.
12. As a developer, I want full-page screenshots (`fullPage: true`), so that below-fold layout is captured.
13. As a developer, I want a single Desktop Chrome viewport for screenshot assertions, so that the baseline set stays small and maintainable.
14. As a maintainer, I want the Playwright config to carry a default `maxDiffPixelRatio` for screenshot comparisons, so that threshold tuning happens in one place.
15. As a developer, I want screenshot basenames to encode the page and state (e.g., `edit-empty`, `edit-with-dates`), so that the generated baseline files are self-documenting.
16. As a maintainer, I want the `npm run clean` script to not delete baseline screenshots, so that local dev iterations are not disrupted.
17. As a contributor, I want a clear visual diff on test failure (Playwright's built-in diff image), so that I can identify what changed without manually comparing PNGs.

## Implementation Decisions

**Decision one: co-locate with existing tests.**

Screenshot assertions are added to the existing e2e test files, not isolated in a separate directory. Each `toHaveScreenshot()` call is inserted at the moment the test has already achieved the target visual state — typically after the behavioural assertions pass and before or after `checkA11y()`. This eliminates duplicate page setup, keeps related assertions together, and means visual regressions fail the same test that exercises the behavioural path.

**Decision two: edit page states.**

The edit page is the richest page, accumulating state as the owner interacts. Four states are captured across existing tests in `postponement-editing.e2e.ts`:

- **Empty**: in the `should maintain accessibility on the editing interface` test, after `EditPage.createSession()` creates a session with no dates. Basename: `edit-empty`.
- **With dates**: in the `should add proposed postponement dates` test, after two dates are added and the count assertion passes. Basename: `edit-with-dates`.
- **With votes**: in the `should show vote tallies on the edit page` test, after a player joins, casts votes, the edit page reloads, and tally assertions pass. Basename: `edit-with-votes`.
- **Confirmed**: in the `should confirm a proposed date, lock the session, and show the reopen control` test, after confirmation and all post-confirmation assertions pass. Basename: `edit-confirmed`.

Other pages (start, create, join) are single-state — one screenshot each added to an existing test.

**Decision three: comparison method.**

Use `toHaveScreenshot()` (pixel-level comparison with diff image on failure) rather than `toMatchSnapshot()` (binary hash, no diff view). The default `maxDiffPixelRatio` is set in `playwright.config.ts` and inherited by all tests. The threshold handles sub-pixel rendering jitter from the deterministic fixture system.

**Decision four: no new files or directories.**

No new test files, no new directories, no new npm scripts. The existing `npm run e2e` discovers all `*.e2e.ts` files and runs them. Screenshot assertions are a thin addition to existing tests — typically one line per state.

**Decision five: baseline management.**

Baseline screenshots are generated on first run via `--update-snapshots` and stored in Playwright's default `test-results/` directory structure. They are committed to git so CI can compare against known-good references. The transient `test-results/` and `playwright-report/` directories remain gitignored for non-baseline artifacts.

## Testing Decisions

**What makes a good test here.** The screenshot assertion is inserted at the moment the page is in the target visual state — after behavioural assertions confirm the state is correct, and typically near the existing `checkA11y()` call. A good screenshot assertion is one that fails when the page looks different, and passes when it looks the same. It does not assert CSS classes, DOM structure, or implementation details — only the rendered pixels.

**Seam.** One seam, existing: the page object layer. Every test that gains a screenshot assertion already uses page objects for navigation and state setup. The screenshot is a single `toHaveScreenshot()` call per state.

**Modules under test.** The SSR-rendered pages: start, create, edit (four states), join. The visual output of each page at a specific state is the unit under test.

**Insertion points.**

- Start page: `start-page.e2e.ts` — `accessibility landmarks check` test, after `checkA11y()`. Captures the full landing page with header, action links, and footer.
- Create page: `postponement-creation.e2e.ts` — `should pass accessibility on create and edit pages` test, after `checkA11y()` on the create page (before any fields are filled). Captures the empty creation form.
- Edit page empty: `postponement-editing.e2e.ts` — `should maintain accessibility on the editing interface` test, after session creation. Captures the bare edit page.
- Edit page with dates: `postponement-editing.e2e.ts` — `should add proposed postponement dates` test, after date count assertion. Captures two proposed dates in the list.
- Edit page with votes: `postponement-editing.e2e.ts` — `should show vote tallies on the edit page` test, after tally assertions. Captures the full vote tally table.
- Edit page confirmed: `postponement-editing.e2e.ts` — `should confirm a proposed date, lock the session, and show the reopen control` test, after confirmation assertions. Captures the locked/confirmed state.
- Join page: `join-voting.e2e.ts` — `join and vote steps are accessible` test, after heading assertion and `checkA11y()`, before player identification. Captures the pristine join form.

**Prior art.** The existing e2e suite provides the page object pattern, the custom fixtures (`checkA11y`, `makeAxeBuilder`), and the session creation helpers (`EditPage.createSession`). The screenshot assertions follow the same import conventions (`import { test, expect } from '../fixtures'`) and reuse the same page object methods already in each test.

**Gates.** Lint (type-check, e2e type-check, ESLint) must pass. The screenshot assertions are included in the existing `npm run e2e` gate. On first run, `--update-snapshots` generates baselines; subsequent runs compare against them.

## Out of Scope

- Multiple viewports (mobile, tablet) — the existing `responsive.e2e.ts` covers multi-viewport via DOM assertions.
- Screenshot tests for the scrape wizard — it has complex multi-step interaction and is lower priority; can be added later.
- Visual regression testing for CSS-only changes in isolation (no page navigation).
- Replacing or modifying the existing a11y assertions — screenshots are added alongside them, not instead of them.
- Changes to the Playwright config's server setup, project definition, or web server configuration.
- Changes to existing page objects.
- New npm scripts or CI pipeline changes beyond what `npm run e2e` already covers.
- Dynamic content masking — the deterministic fixture system makes masking unnecessary.

## Further Notes

- The "with votes" edit-page state requires cross-page interaction: a session is created via the edit page, then a player joins via the join page and casts votes, then the edit page is reloaded. The existing test already orchestrates this — the screenshot assertion simply captures the result.
- Baseline PNGs will be stored in Playwright's default output directory. They should be committed to git; the gitignore must allow baseline files while still ignoring transient test artifacts.
- The `toHaveScreenshot()` default comparison is pixel-by-pixel with an anti-aliasing aware algorithm. The `maxDiffPixelRatio` threshold in the Playwright config provides a single tuning knob.
- This spec does not require an ADR: screenshot testing is a natural extension of the existing Playwright e2e strategy (ADR 0005), not a new architectural decision.
