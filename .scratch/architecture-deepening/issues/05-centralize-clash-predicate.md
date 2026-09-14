# 05: Centralize the clash predicate

**What to build:** The "does this Proposed Date have a Clash?" rule has one home. A single predicate answers it wherever the app needs it — confirming a date, auto-deselecting a newly added date, and rendering the rail's clash chips — and the session-attach and auto-deselect steps live beside it. The route keeps fetching both schedules and degrading on failure, but the async fetch helper moves out of the add-dates handler into a neutral edit-directory module so the refresh handler no longer imports another handler's internals. The duplicated buffered-window scan between clash and occupancy computation collapses. The organizer sees the same clash and occupancy information.

**Blocked by:** 04 (agreed order)

**Status:** ready-for-agent

- [x] One `isDateClashing` predicate replaces the four copied expressions (confirm handler, add-dates auto-deselect, rail chips)
- [x] Attach and auto-deselect session rules are centralized with the predicate
- [x] The async fetch-and-degrade helper moves to a neutral module; refresh no longer imports the add-dates handler
- [x] The buffered-window scan is implemented once and shared by clash and venue-occupancy computation
- [x] Clash and venue-occupancy behaviour is unchanged; their unit tests and the clash e2e are green
- [x] `npm run verify` passes

## Comments

- `0be8483` ticket done: centralized `isDateClashing` + `applyClashCheckResult` in `clashes.ts`, shared `gamesInBufferedWindow`, moved the fetch helper to `clash-check.ts`; `ffb9d1a` review; `89d32a8` review-fixed (trailing newline, inline type import). `npm run verify` green apart from the known-flaky `focus-management` votable-switch test, which passes 7/7 in isolation.
