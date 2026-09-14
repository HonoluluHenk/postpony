# 04: Singular Venue Occupancy

**What to build:** A Proposed Date with exactly one Venue Occupancy reads "1 other game" (German "1 weiteres Spiel") instead of "1 other games", via a new singular translation key following the existing singular-plural precedent. Counts of two or more keep the current plural text.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] The vote page renders the singular text for a Proposed Date with Venue Occupancy 1
- [x] Counts >= 2 render the plural text
- [x] New key exists in both locale files with matching parameters
- [x] `npm run verify` passes

## Comments

- `a2045a0` ticket done: 04-singular-venue-occupancy — new `venue_legend_occupancy_one` key (en/de), vote page picks singular at count 1, view + translations specs extended, stale `1 other games` e2e assertion corrected.
- `7c87ead` review: 04-singular-venue-occupancy — two-axis review, 0 hard violations, 0 spec findings, no fixes required.
- `npm run verify` passed: 39 test files / 690 tests, build, 122 e2e.
