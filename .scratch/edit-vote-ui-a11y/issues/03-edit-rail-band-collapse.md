# 03: Edit rail: long availability bands collapse behind a disclosure

**What to build:** when the organizer sorts by availability and a band holds many dates (the fixture's "Not playable (24)" is the real example), the band renders as a native disclosure so the full-strength and if-necessary dates come first instead of a wall of repeated zero tallies. The heading keeps the band label and count, the top (full-strength) band renders open by default, and an HTMX swap resets every band to the same default so a partial re-render can never strand a collapsed/expanded mismatch. Controls that live inside a collapsed band (Delete, Votable, Confirm Date) stay reachable in place once expanded.

**Blocked by:** 02 — Edit rail: vote dots readable without sight

**Status:** ready-for-agent

- [ ] A band whose row count exceeds the threshold (6) renders its rows inside a native disclosure whose summary shows the band label + count; bands at or under the threshold render as today.
- [ ] The full-strength band renders open by default; a request-fragment swap resets all bands to the same default.
- [ ] After expanding a band, its Delete / Votable / Confirm Date controls work in place, without leaving the band.
- [ ] The disclosure opens/closes with the keyboard, has a visible focus state, and honours reduced motion; render spec + keyboard e2e + axe pass.
- [ ] Sorting by Date still renders the week-grouped list unchanged (no collapse), so the collapse is scoped to the availability sort alone.