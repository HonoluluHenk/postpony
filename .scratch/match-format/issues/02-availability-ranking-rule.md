# 02: The availability ranking rule

**What to build:** A pure operation on the Postponement domain class that turns a session and a team into the four cascading availability groups. It is the single source of truth for "which dates are playable, and how comfortably", shared later by both captain pages.

**Blocked by:** 01

**Status:** ready-for-agent

- [x] The operation returns an ordered list of groups, each with a closed kind — `fullStrength` | `withIfNecessary` | `reducedStrength` | `notPlayable` — and its dates in ranked order.
- [x] Counts come from the viewing team's own votes: `definitive = Yes`, `availability = Yes + IfNecessary`.
- [x] The groups cascade over the session's votable Proposed Dates, each claiming only what earlier groups left: `fullStrength` when `yes >= maxPlayers`; then `withIfNecessary` when `availability >= maxPlayers`; then `reducedStrength` when `minPlayers <= availability < maxPlayers`; then `notPlayable` for the rest.
- [x] Every non-votable date lands in `notPlayable` regardless of its tally, and never competes for the first three groups.
- [x] `fullStrength` is ordered by `yes` desc, then `ifNecessary` desc, then start asc; the other three by `availability` desc, then start asc; a stable id tie-break keeps equal starts deterministic.
- [x] Empty groups are omitted.
- [x] Unit coverage at the domain seam: each boundary just below, at, and above `minPlayers` / `maxPlayers`; a closed date with a full-strength tally; each group's within-group order; empty groups; both teams ranking on their own votes.
