# Review: 02-date-card-visible-all-widths

Fixed point: `1c03cb3` (chore: comments for 01-viewport-e2e-harness)
Commit reviewed: `45333cd` ticket done: 02-date-card-visible-all-widths

## Standards

No hard violations. Reviewed against AGENTS.md, the `css-styling` skill
(design tokens, `@layer design`, BeerCSS-first), the `testing` skill (a11y
selectors, `setViewport`, `checkA11y`, observable-behaviour assertions), and the
code-review smell baseline.

- CSS: `min-height: 7rem` reuses the existing token value; new media query stays
  inside `@layer design`; no hardcoded colours, no inline styles. The card-wrapping
  rules moved into their own `@media (max-width: 992px)` block and the generator
  grid stacking stays phone-only at `@media (max-width: 599px)` — a separate
  block per concern, matching the existing pattern of distinct breakpoint blocks.
- e2e: new helpers `expectFullyWithin` and `expectNotHorizontallyTruncated` assert
  observable layout (bounding box containment, scrollWidth vs clientWidth) — not
  CSS property values, so they comply with the "tests never assert CSS property
  values" rule. `expectNotHorizontallyTruncated` uses `scrollWidth <= clientWidth`,
  a layout metric that directly detects the nowrap/ellipsis truncation bug. Both
  helpers mirror the `expectFullyInViewport` pattern (throw on missing box).
- No smell baseline matches: no mysterious names, no speculative generality, no
  duplicated logic (the two bounding-box helpers test different clipping sources:
  viewport edge vs ancestor overflow).

Judgement call (not a violation): the `@media (max-width: 992px)` breakpoint now
appears in two blocks (existing table-stacking + this card-wrapping one). Same
breakpoint, different concerns; the codebase already uses this one-breakpoint-
per-concern style for the 599px breakpoint. No consolidation needed.

## Spec

Faithful to ticket 02 and the Phase 1 Implementation Decisions. All six non-gate
criteria implemented, and `npm run verify` passes:

1. Card minimum height (was fixed) + details row no longer hides overflow —
   `min-height: 7rem`, `overflow: hidden` removed.
2. Date text: `white-space: nowrap`, `overflow: hidden`, `text-overflow: ellipsis`
   and `max-width: 12.5rem` all removed; wraps naturally.
3. Card-wrapping media query widened to `@media (max-width: 992px)` (below 993px);
   generator grid stacking remains phone-only.
4. e2e at tablet: full date text of the first card visible, both check chips on a
   clean row, clash chip on a clash row.
5. e2e at phone: same assertions (parameterised over `['tablet', 'phone']`).
6. Desktop unchanged apart from removed truncation — verified empirically: the
   venue badge shifts ~71px to the card's right edge (a direct consequence of
   removing the max-width), which is within the 2% `toHaveScreenshot` tolerance.
   An `--update-snapshots` run left all four `postponement-editing` baselines
   byte-identical, so no baseline regeneration was required.
7. `npm run verify` passes (lint, test [coverage 90%+], build, e2e [104 passed]).

No scope creep: only CSS + the responsive e2e spec + the ticket file changed; no
markup, no unrelated files.

## Summary

Standards: 0 findings (1 non-issue judgement call). Spec: 0 findings. No fixes
needed; no `review-fixed` commit.
