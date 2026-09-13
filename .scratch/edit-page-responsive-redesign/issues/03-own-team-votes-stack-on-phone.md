# 03: Own-team Votes table stacks on phone

**What to build:** On a phone the Organizer reads the own-team Votes table row by row (stacked cards, like the home/away tallies already do) with no column cut off at the viewport edge.

**Blocked by:** 01 (Viewport-parameterised e2e harness)

**Status:** ready-for-agent

- [ ] Every body cell of the own-team Votes table carries a data label matching its column header, so the existing narrow-screen stacking pattern applies
- [ ] Unit render spec asserts data labels on the cells
- [ ] e2e at phone: the "voted" cell of the first row has a bounding box fully inside the viewport
- [ ] Desktop table rendering unchanged
- [ ] `npm run verify` passes
