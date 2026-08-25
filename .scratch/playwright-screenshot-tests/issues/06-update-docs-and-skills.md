# 06: Update docs, ADRs, and agent skills for screenshot testing

**What to build:** Update the project's documentation to reflect the new screenshot testing capability so future agents and contributors know how to add and maintain visual regression tests.

**Blocked by:** 01 (Playwright screenshot config), 02–05 (screenshot tests themselves).

**Status:** ready-for-agent

## What to update

### ADR 0005 — supplement, not replace

ADR 0005 covers *why* Playwright was chosen. Screenshot testing is a natural extension, not a new architectural decision. Add a brief "Supplements" section or note at the bottom of `docs/adr/0005-e2e-testing-playwright.md` mentioning:

- Visual regression via `toHaveScreenshot()` is now part of the e2e strategy
- Default threshold lives in `playwright.config.ts` (`maxDiffPixelRatio: 0.02`)
- Baselines are committed to git; `--update-snapshots` regenerates them
- Screenshot assertions are co-located with existing behavioural tests, not in a separate directory

### `testing` skill — add screenshot section

Add a new section to `.agents/skills/testing/SKILL.md` covering:

- **When to use**: adding or updating visual regression assertions
- **Pattern**: `await expect(page).toHaveScreenshot({ name: '...', fullPage: true })` inserted at the right state checkpoint in an existing test
- **Co-location**: assertions go in existing test files (e.g. `postponement-editing.e2e.ts`), not in a separate `e2e-tests/screenshots/` directory
- **Config**: `maxDiffPixelRatio: 0.02` in `playwright.config.ts` under `expect.toHaveScreenshot` — tune in one place
- **Baseline management**: `npx playwright test --update-snapshots` generates/regenerates baselines; baselines live alongside test results and are committed to git
- **Naming convention**: `name` encodes page + state (e.g. `edit-empty`, `edit-with-dates`)
- **Full-page**: always pass `fullPage: true` to capture below-fold layout
- **Update baselines after CSS/BeerCSS changes**: run `--update-snapshots`, visually verify the diff, commit

### AGENTS.md — quick reference + testing gotchas

- Add `--update-snapshots` row to the quick reference table
- Add a screenshot testing bullet to the "Testing gotchas" section noting the co-location pattern and config threshold
