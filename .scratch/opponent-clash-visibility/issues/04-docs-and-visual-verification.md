# 04: Docs, visual verification, and full gate

**What to build:** the closing slice. The domain glossary records the opponent captain's clash visibility and re-check right and notes per-side clash visibility on the Clash entry; a new architecture decision record captures the opponent-triggered, own-side-only refresh of the shared snapshot. The opponent layout is verified visually against the running app on clashing and clean dates at narrow and wide viewports, and the full verification gate (lint, tests with the coverage bar, build, end-to-end) passes.

**Blocked by:** 02 — Own-side clash chips on the opponent page; 03 — Opponent-triggered schedule re-check.

**Status:** ready-for-agent

- [x] The glossary entries for Opponent Captain and Clash describe the scoped visibility and the re-check.
- [x] The new decision record covers the own-side-only refresh, the merge rule, and the home-side occupancy condition.
- [x] Screenshots confirm the chip row, the four-part date, and the refresh button sit cleanly in the opponent layout at narrow and wide viewports.
- [x] The full verification gate passes with coverage at or above the repo bar.
