# 03: Opponent-triggered schedule re-check

**What to build:** the Opponent Captain gets a schedule re-check button on their page. It scrapes only their own team's schedule, merges the fresh lines into the shared snapshot (the organizer side's lines are preserved), and re-renders the opponent view with a success announcement. A failed check keeps the previous snapshot and shows the refresh-failed warning; a first check that fails renders the plain nothing state. The symmetric votable switch is never touched. When the opponent sits on the home side the check also refreshes Venue Occupancy, preserving the previous value if that fetch fails; on the away side occupancy is left untouched. No button is offered when the opponent side has no team identity.

**Blocked by:** 01 — Shared schedule check in the library with an own-side merge rule.

**Status:** ready-for-agent

- [x] The re-check is gated by the opponent-captain password and re-renders the opponent partial.
- [x] After a re-check the opponent page shows fresh own-side lines while the organizer side's stored lines are byte-identical to before.
- [x] No votable flag changes on any date as a result of the re-check.
- [x] A failed re-check with a previous snapshot keeps all chips and shows the warning; without a previous snapshot it shows the nothing state.
- [x] Occupancy refreshes on the home side and is preserved on the away side and on partial fetch failure.
- [x] End-to-end coverage asserts the refresh flow and the failed-refresh degradation.

## Comments
- a8188a3 opponent-scoped POST /opponent/:id/refresh-clashes via the opponent pipeline: own-side scrape + merge, home-only occupancy, refresh-failed warning/nothing-state degradation, never flips votable; e2e covers the fixture-backed refresh flow (failed-scrape degradation at handler level — the e2e server pins the complete fixtures dir, same precedent as clash-checks.e2e.ts); also moved the opponent status announcement outside the HTMX swap target so the refreshed announcement (and veto/acceptable ones) survive partial swaps.
