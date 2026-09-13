# 04: Singular Venue Occupancy

**What to build:** A Proposed Date with exactly one Venue Occupancy reads "1 other game" (German "1 weiteres Spiel") instead of "1 other games", via a new singular translation key following the existing singular-plural precedent. Counts of two or more keep the current plural text.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The vote page renders the singular text for a Proposed Date with Venue Occupancy 1
- [ ] Counts >= 2 render the plural text
- [ ] New key exists in both locale files with matching parameters
- [ ] `npm run verify` passes

## Comments
