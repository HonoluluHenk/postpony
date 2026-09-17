# 04: Opponent page availability sort

**What to build:** The opponent captain's page ranks its own team's votable dates with the same four Match Format groups and labels as the edit page, through the shared ranking and label mapping.

**Blocked by:** 03

**Status:** ready-for-agent

- [x] The opponent page's availability sort renders the four domain groups scoped to the opponent team's own votes, using the shared label mapping introduced on the edit page.
- [x] The page keeps sourcing only votable dates, so closed dates never appear here.
- [x] The existing `Available: N` group assertions are replaced with the new headers; the *Date* sort, the `?sort=` transport, and mutation-preserves-sort behaviour are unchanged.
- [x] E2E coverage via the opponent Page Object: switch to Availability, assert the new headers and ordering for the opponent side, and that a mutation keeps the sort. `checkA11y()` passes.

## Comments

Ticket 04 was largely delivered by ticket 03: removing the count-based helper forced the opponent page onto the shared `groupByAvailabilityBands`/label mapping, and its component, handler and e2e specs were updated there. This ticket adds the explicit criterion-2 assertion — the closed date (`pd-2`) is absent from both `dates` and `availabilityBands` — and closes the ticket. No review fixes needed.
