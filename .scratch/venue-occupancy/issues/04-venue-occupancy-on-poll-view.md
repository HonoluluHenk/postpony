# 04: Venue occupancy on the poll view

**What to build:** Participants see the same Venue Occupancy count per Proposed Date when voting, so they can weigh hall availability on the same snapshot the organizer decided on.

**Blocked by:** 03 (needs the occupancy snapshot format and count-line rendering)

**Status:** ready-for-agent

- [x] The participant poll (vote) view renders the stored occupancy count line per Proposed Date, in the shared clash-info component pattern, from the same snapshot as the edit page
- [x] Clean/zero occupancy renders a clean line; absent data renders nothing (consistent with the edit page)
- [x] Localization keys added for any poll-view-specific wording (fr/it reuse English per ADR-0016)
- [x] E2E on the poll flow: join a session, view proposed dates, see the occupancy count render
- [x] Prior art: `vote-view.tsx` clash display, `clash-info.tsx` shared component