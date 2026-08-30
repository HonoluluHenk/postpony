# 02: Venue occupancy computation

**What to build:** The pure counting logic that turns a club's home schedule into a per-Proposed-Date Venue Occupancy count and its conflicting Matches, so the signal is computed without any I/O and is unit-testable on its own.

**Blocked by:** 01 (needs `Match.venueNumber`)

**Status:** ready-for-agent

- [ ] New pure module with `computeVenueOccupancy(proposedDates, homeMatches, originalMatch)` returning, per Proposed Date, `{ count, matches }` where `matches` carry the opponent name and the start time
- [ ] A Match counts when its `venueNumber` matches the date's venue (`venueNumber ?? 1`) and its start falls within `[proposedStart − CLASH_BUFFER_HOURS, proposedEnd + CLASH_BUFFER_HOURS]` (same buffer and window helpers as `computeClashes`)
- [ ] The postponed Match itself is excluded
- [ ] Matches without a venue number are skipped (never guessed as venue 1)
- [ ] Unit tests: exact counts per date, buffer boundaries, venue filtering (same time, different venue → not counted), postponed-match exclusion, venue-less rows skipped, empty schedule
- [ ] Prior art: `clashes.spec.ts` (pure buffer-window logic)