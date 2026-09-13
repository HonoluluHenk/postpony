# 03: Own-team Votes table stacks on phone

**What to build:** On a phone the Organizer reads the own-team Votes table row by row (stacked cards, like the home/away tallies already do) with no column cut off at the viewport edge.

**Blocked by:** 01 (Viewport-parameterised e2e harness)

**Status:** ready-for-agent

- [x] Every body cell of the own-team Votes table carries a data label matching its column header, so the existing narrow-screen stacking pattern applies
- [x] Unit render spec asserts data labels on the cells
- [x] e2e at phone: the "voted" cell of the first row has a bounding box fully inside the viewport
- [x] Desktop table rendering unchanged
- [x] `npm run verify` passes

## Comments

- Implemented in `5be4275` (ticket done: 03-own-team-votes-stack-on-phone); reviewed in `d7a60d9` (review: 03-own-team-votes-stack-on-phone) — no issues found, no review-fixed commit.
- Summary: the own-team Votes table's player vote cells and the voted-count cell now carry `data-label` attributes matching their column headers, so the existing `table:has(td[data-label])` stacked-table pattern applies on phones; the unit render spec asserts the labels and a phone-viewport e2e test checks the first row's "Voted" cell bounding box is fully inside the viewport (with a no-horizontal-overflow guard). Desktop table rendering is unchanged — the `data-label` attributes are inert above the 992px breakpoint, so no screenshot baselines needed regeneration.
