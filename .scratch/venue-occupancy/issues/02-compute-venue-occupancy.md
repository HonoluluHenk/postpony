# 02: Venue occupancy computation

**What to build:** The pure counting logic that turns a club's home schedule into a per-Proposed-Date Venue Occupancy count and its conflicting Matches, so the signal is computed without any I/O and is unit-testable on its own.

**Blocked by:** 01 (needs `Match.venueNumber`)

**Status:** ready-for-agent

- [x] New pure module with `computeVenueOccupancy(proposedDates, homeMatches, originalMatch)` returning, per Proposed Date, `{ count, matches }` where `matches` carry the opponent name and the start time
- [x] A Match counts when its `venueNumber` matches the date's venue (`venueNumber ?? 1`) and its start falls within `[proposedStart − CLASH_BUFFER_HOURS, proposedEnd + CLASH_BUFFER_HOURS]` (same buffer and window helpers as `computeClashes`)
- [x] The postponed Match itself is excluded
- [x] Matches without a venue number are skipped (never guessed as venue 1)
- [x] Unit tests: exact counts per date, buffer boundaries, venue filtering (same time, different venue → not counted), postponed-match exclusion, venue-less rows skipped, empty schedule
- [x] Prior art: `clashes.spec.ts` (pure buffer-window logic)

## Comments

- 701a769 (ticket done): new `src/lib/venue-occupancy.ts` pure module + spec; exported `bufferedWindow` and `isOriginalMatch` from `clashes.ts` so both signals share the same buffer/window and exclusion logic. Lint clean, 568/568 tests pass, coverage ≥80% all metrics.