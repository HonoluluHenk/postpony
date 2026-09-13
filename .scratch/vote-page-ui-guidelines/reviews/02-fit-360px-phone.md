# Review: 02-fit-360px-phone

Fixed point: `70442be` (docs: 04-singular-venue-occupancy comments)
Diff: `git diff 70442be...HEAD`
Commits: `d8a147b ticket done: 02-fit-360px-phone`

## Standards

Reviewed against AGENTS.md, the `css-styling`, `testing`, and `route-handlers`
skills, the ESLint/tsc gate, and the Fowler smell baseline.

- Set-all wrapping uses BeerCSS's own `.row.wrap` (`display:flex;flex-wrap:wrap`)
  instead of hand-rolled CSS; `.row` already supplies the flex container, so the
  bare `no-wrap` was redundant. BeerCSS-first, no new selector. No breach.
- The radio wrap is one property (`flex-wrap: wrap`) on the existing
  `.vote-radio-group` selector and the 44px target is `padding-block:
  var(--space-3)` on `> label` — both in `style.css`'s `@layer design` block,
  using a spacing token rather than a literal. No breach.
- Tests assert what a user/screen reader perceives: accessible names
  (`getByRole('button', {name: 'Set all: No'})`), bounding-box height, and
  horizontal position; `checkA11y()` runs at both widths. The `.vote-radio-group`
  class locator is explicitly tolerated prior art in the `testing` skill, and
  `<label>` has no ARIA role to select by. No breach.
- `expectInsideViewportWidth` carries an explicit `Promise<void>` return type;
  `tsc` + `eslint --max-warnings 0` pass. No breach.
- Smell baseline: no Mysterious Name, Feature Envy, Primitive Obsession,
  Repeated Switches, Shotgun Surgery, Speculative Generality, Middle Man, or
  Refused Bequest.

Judgement notes (not violations):

- **Duplicated Code (mild):** the new `expectInsideViewportWidth` helper mirrors
  `expectFullyInViewport` in `responsive.e2e.ts`. Both are ~8-line local helpers
  with no shared e2e-helper module in the repo; extracting a module for one
  second caller would be the speculative generality the repo warns against.
  Revisit if a third caller appears.
- Repeated arrange blocks across the three new tests (`setViewport` →
  `createSession` → `goto` → `join`) are the normal e2e cost of independent
  cases; the `JoinPage` Page Object already holds the shared behaviour.

Standards findings: 0.

## Spec

Spec: `.scratch/vote-page-ui-guidelines/spec.md` (Implementation Decisions:
"Set-all row wraps", "Vote radio group wraps", "Radio hit target") and ticket
`.scratch/vote-page-ui-guidelines/issues/02-fit-360px-phone.md`.

- "The set-all button row drops its no-wrap behaviour and allows wrapping." —
  Implemented: `vote.tsx` renders `.row.wrap`; the `phoneSmall` guard finds the
  "Set all: No" button fully inside the viewport.
- "The per-date radio row gains `flex-wrap: wrap`." — Implemented on
  `.vote-radio-group`; the German guard checks every label of the first date.
- "Radio labels … get vertical padding so their box is at least 44px tall; the
  three options remain one row on desktop." — Implemented: `padding-block:
  var(--space-3)` (24px content + 24px padding = 48px); the desktop test asserts
  all three labels share one row top.
- "`checkA11y` passes at `phoneSmall` and `desktop`." — Implemented: each new
  test ends with `checkA11y()`.
- "existing screenshot baselines … updated only where the wrap/padding changes
  them." — No vote-page baseline exists in `e2e-tests/*-snapshots/`; the join and
  edit baselines are untouched by these selectors, and the full `npm run verify`
  screenshot comparisons passed. Nothing needed updating.

Missing requirements: none. Scope creep: none. Behaviour implemented but wrong:
none.

Spec note (not a defect in the implementation): the German `phoneSmall` guard
passes against the unfixed markup too — at 360px the render was measured with
pre-fix CSS and only the set-all assertion failed; the German labels already fit
on one row. The guard is the assigned "inside viewport" assertion and catches a
future regression, but on its own it does not prove the wrap fix; the wrap is
proven by `flex-wrap: wrap` plus the desktop one-row guard bounding it.

Spec findings: 0.

## Summary

- Standards: 0 findings. Worst issue: none (two non-blocking judgement notes).
- Spec: 0 findings. Worst issue: none.
