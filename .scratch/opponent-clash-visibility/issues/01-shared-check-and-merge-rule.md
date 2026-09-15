# 01: Shared schedule check in the library with an own-side merge rule

**What to build:** the groundwork every later ticket stands on, with zero user-visible change. The shared schedule-check routine moves from the edit route area into the shared library so both captain surfaces can consume it, and the Clash domain module gains a pure own-side merge rule: given a stored snapshot plus a fresh single-team schedule, it replaces that side's clash lines while preserving the other side's lines and the Venue Occupancy snapshot. The edit page, its refresh, and the whole existing suite behave exactly as before.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] The edit page's add-date and manual-refresh flows produce byte-identical snapshots and behavior as before the move.
- [x] The own-side merge rule replaces only the named side's clash lines and preserves the other side plus occupancy, covered at the pure domain seam.
- [x] A first merge onto dates with no previous snapshot yields own-side lines and an absent other side.
- [x] The existing unit, handler, and end-to-end suites stay green.

## Comments
- 53a1028 shared clash check moved to src/lib plus own-side merge rule, suites green (953 tests).
