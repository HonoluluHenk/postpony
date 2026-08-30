# 05: Occupancy tooltip with conflicting matches

**What to build:** Hovering (or tapping, on touch) the Venue Occupancy count reveals the conflicting Matches — opponent and start time — so the organizer and participants can judge whether the hall conflict is real rather than acting on the bare count.

**Blocked by:** 04 (needs the count rendered on both views with the `matches` data in the snapshot)

**Status:** ready-for-agent

- [x] The occupancy count line becomes interactive: hovering/tapping shows the conflicting Matches (opponent + localized start time) in a tooltip/popup
- [x] Implemented with the project's existing HTMX/JS conventions and accessible (keyboard-reachable, dismissible)
- [x] Rendered on both the edit page and the poll view
- [x] Localization keys for the tooltip wording (fr/it reuse English per ADR-0016)
- [x] Browser/e2e test: the tooltip reveals the expected matches; a11y check passes (per the testing skill's `checkA11y`)
## Comments

- 16a5409 — tooltip implemented: count chip becomes a `role="tooltip"` button (delegated ui.js show/hide, hover/focus/tap, Escape-dismissible), shared partial renders on edit + poll views, en/de keys added, browser+unit+e2e tests cover reveal and a11y.
