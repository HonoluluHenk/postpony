# Review: 01-single-picker-15-minute-steps

Review of `c5e41cb` (diff `ba52b8c...HEAD`).
Spec source: `.scratch/15-minute-time-picker/spec.md` + `issues/01-single-picker-15-minute-steps.md`.
Standards sources: repo `AGENTS.md` (lazy senior dev, strongly typed, testing conventions) + smell baseline.

## Standards

- Pass overall. Change is minimal and lazy: one production line (`minutesStep: 15` in `initProposedDateTimePicker`, `src/public/assets/js/ui.js:196`), the rest is tests. No new abstractions, no new dependencies, no server edits.
- The new comment on `minutesStep` is a product-rule comment rather than a ponytail note; fine, it documents *why* rather than a ceiling. No change needed.
- Browser spec (`ui.spec.js`) follows existing patterns: DOM built in `beforeEach`, cleared in `afterEach`, fake replaces the vendor global and is restored. Matches the recording-fake approach the spec's Testing Decisions call for.
- E2E additions reuse established Playwright idioms (`getByRole`, `getByLabel`, scoped picker locator) and the en-US default locale; the new swap test follows the existing `date-picker.e2e.ts` style.
- **Judgement call — negative assertion:** `expect(fakeInstances[0].opts.hoursStep).toBeUndefined()` (ui.spec.js) asserts an implementation choice (not overriding the hour step) rather than behavior. If the code later passes `hoursStep: 1` explicitly (same behavior), the test breaks. The e2e asserts the real rendered hour-slider `step="1"`, which is the behavior-level check; the unit negative is defensible documentation of "unchanged" but is the weakest test here. Not a blocker.

## Spec

All six acceptance criteria implemented:

1. Minute slider steps 15 / hour stays 1 — `minutesStep: 15`, `hoursStep` left at vendor default 1; e2e asserts rendered `step="15"` / `step="1"`.
2. Free-text + tolerant server grammar untouched — no server path changed; `parseLocaleDateTime`/edit-handler specs stay green (196 targeted + full suite 574 green).
3. Opens only via button, stays live after swap — existing never-on-focus covered by e2e; new e2e drives a real invalid-DT submit (partial swap) then reopens the picker; unit test asserts button-only `show()` and destroy+recreate on re-init.
4. Browser unit asserts `minutesStep: 15` via recording fake — done.
5. E2E asserts 15-per-step slider + a11y scan passes — step attributes asserted; existing `checkA11y` in the same test still passes. Matches spec testing decision ("does not assert DOM/implementation detail beyond the option wiring that encodes the rule").
6. Existing parsing/edit-handler tests green — verified.

No scope creep: generator weekday rows, row pickers, new locale keys, and server validation are all untouched (ticket 02 territory). No off-grid rounding.

## Summary

Standards: 1 judgement call (hoursStep negative assertion), no violations. Spec: all 6 criteria met, no gaps or creep.