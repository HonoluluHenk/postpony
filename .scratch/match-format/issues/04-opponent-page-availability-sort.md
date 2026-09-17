# 04: Opponent page availability sort

**What to build:** The opponent captain's page ranks its own team's votable dates with the same four Match Format groups and labels as the edit page, through the shared ranking and label mapping.

**Blocked by:** 03

**Status:** ready-for-agent

- [x] The opponent page's availability sort renders the four domain groups scoped to the opponent team's own votes, using the shared label mapping introduced on the edit page.
- [x] The page keeps sourcing only votable dates, so closed dates never appear here.
- [x] The existing `Available: N` group assertions are replaced with the new headers; the *Date* sort, the `?sort=` transport, and mutation-preserves-sort behaviour are unchanged.
- [x] E2E coverage via the opponent Page Object: switch to Availability, assert the new headers and ordering for the opponent side, and that a mutation keeps the sort. `checkA11y()` passes.
