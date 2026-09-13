# Review: 08-generator-grid-two-up-phone

**Fixed point:** `8ac068d` (before `ticket done`). Diff: `git diff 8ac068d...HEAD`.
**Commit under review:** `29f7f46` ticket done: 08-generator-grid-two-up-phone
**Spec:** `.scratch/edit-page-responsive-redesign/spec.md` + `issues/08-generator-grid-two-up-phone.md`

## Standards

Reviewed the diff against the repo standards (AGENTS.md, css-styling skill, testing skill) plus the smell baseline. Clean pass; no documented-standard violation and no baseline smell.

- **Tokens, not literals** — the new `margin-bottom: var(--space-5)` and the grid gaps (`var(--space-2)`) all reference design tokens; the hard-coded `3rem` is gone. ✔
- **New selectors in the existing `@layer design` block of style.css** — the phone-media rules extend the existing `@media (max-width: 599px)` block. ✔
- **Phone-only scope** — the two-up grid rules sit inside `@media (max-width: 599px)`, so ≥600px keeps the default one-per-row list; base `.generate-time-row` rules are untouched. ✔
- **Ponytail comment** — the `/* ponytail: … */` on the spacing change names the a11y ceiling (open time-picker popup crowding the From picker at 1rem) and the upgrade path (1.5rem). Consistent with the repo convention.
- **e2e asserts behaviour, not CSS property values** — the new test uses `getBoundingClientRect()` (the same bounding-box pattern as `responsive.e2e.ts`) to assert fit + two-per-row, not a CSS value. Count and viewport assertions are behaviour-level. ✔
- **Smells** — no duplicated logic, no speculative generality, no feature envy, no data clumps; the change is a cohesive one-feature diff (3 source files + 3 baselines).

**One judgement call (non-blocking):** `--space-5` (1.5rem) rather than the ticket's example `--space-4` (1rem). At 1rem the open row time-picker popup overlaps the `#fromDate-picker` button and fails the WCAG 2.2 target-offset (`wcag258`) scan; 1.5rem keeps it green. `--space-5` is the `.mt-4` standard token, so it still satisfies "standard spacing token instead of 3rem". The reasoning is captured in the ponytail comment.

## Spec

All acceptance criteria are met; no missing, extra, or incorrect behaviour found.

- **Two-up below 600px, unchanged at 600px+** — `grid-template-columns: 1fr 1fr` on the new `generate-time-grid` class (`.scratch/.../08` box 1). At ≥600px the `<ol>` stays the default `.list` one-per-row. ✔
- **Standard spacing token instead of 3rem** — `.generate-controls` `margin-bottom: 3rem → var(--space-5)` (box 2). ✔
- **Generating dates works end-to-end at phone width** — the new e2e fills two weekdays, submits, and asserts the toast + non-empty list at the phone viewport (box 3). ✔
- **`checkA11y` passes at phone; baselines regenerated** — `checkA11y()` runs at the phone state; `edit-empty`, `edit-with-dates`, `edit-with-votes` baselines regenerated (the only ones legitimately changed by the 1.5rem shift; `edit-confirmed` correctly unchanged). ✔
- **`npm run verify` passes** — exit 0, 109 e2e, lint + coverage + build green (box 5). ✔
- **Weekdays remain Monday–Sunday (ADR-0021)** — the `weekdayLabels[locale]` order and the `for`/`id` index mapping are untouched; only a CSS class was added to the `<ol>`. ✔

**Scope check:** no join/create/start-page change, no new dependency, no prototype/font/palette change, no vote-count merge — all out-of-scope items stay untouched. The `--space-5` vs `--space-4` choice falls within the ticket's "e.g. `--space-4` or whatever the design system's standard spacing is" latitude.

## Summary

Standards: 0 blocking findings (1 documented judgement call on `--space-5`). Spec: 0 findings. No `review-fixed` needed.
