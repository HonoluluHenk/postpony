# Review: 01-viewport-harness-phone-small

Fixed point: `fe1f3a0` (spec + tickets)
Diff: `git diff fe1f3a0...HEAD`
Commits: `58f29b9 ticket done: 01-viewport-harness-phone-small`

## Standards

Reviewed against AGENTS.md, the `testing` skill, and the Fowler smell baseline.

- `phoneSmall: {width: 360, height: 740}` is added to the existing `viewports`
  record in the established key order and `as const` style; `ViewportName` /
  `viewportNames` / `setViewport` pick it up with no extra code. No standard
  breach.
- The smoke test uses the shared `fixtures` `test`/`checkA11y`, the `JoinPage`
  Page Object, and `setViewport` — all prior art from `responsive.e2e.ts` and
  `join-voting.e2e.ts`. No raw CSS selectors, no ad-hoc viewport numbers. No
  standard breach.
- `EditPage` and `JoinPage` are imported from the `./pages` barrel, matching
  every other e2e spec. No standard breach.
- No smell triggered: no duplicated logic (createSession is reused), no
  speculative generality (the one extra test is exactly what the ticket asks
  for), no mysterious names.

Judgement note (not a violation): adding `phoneSmall` to `viewportNames` makes
the existing edit-page loops in `viewport-smoke.e2e.ts` and `responsive.e2e.ts`
run one extra iteration each. That is the documented intent of the shared helper
("one fix covers all breakpoints"), not an edit to those tests.

Standards findings: 0.

## Spec

Spec: `.scratch/vote-page-ui-guidelines/spec.md` (Implementation Decisions:
"Viewport harness") and ticket
`.scratch/vote-page-ui-guidelines/issues/01-viewport-harness-phone-small.md`.

- "The named-viewport e2e helper gains a `phoneSmall` 360x740 entry; the
  existing `phone` 390 entry stays as is." — Implemented: `phoneSmall` added at
  360x740, `phone`/`tablet`/`desktop` unchanged.
- "A smoke test opening the vote page at `phoneSmall` passes `checkA11y`." —
  Implemented: `Vote page viewport smoke › vote page is accessible at the
  phoneSmall viewport` opens the join page via `join('Alice')` and calls
  `checkA11y()`.
- "No production code changes." — Only `e2e-tests/viewports.ts` and
  `e2e-tests/viewport-smoke.e2e.ts` changed. No `src/` change.
- "Existing e2e tests and screenshot baselines are untouched and green." — No
  existing test body or snapshot was edited; `npm run verify` ran 121 tests, all
  green.
- "Keep existing `phone`/`tablet`/`desktop` entries unchanged." — Confirmed.

Missing requirements: none. Scope creep: none.

Spec findings: 0.

## Summary

- Standards: 0 findings. Worst issue: none.
- Spec: 0 findings. Worst issue: none.
