# 02: Match-list renders one select per row

**What to build:** The match-list step of the scrape wizard renders exactly one submit button per Match row, labelled with the generic select key ("Select" / "Auswählen"), with the organizer's chosen team threaded into every row's form as a hidden field alongside the existing match fields. The wizard rendering spec asserts this new shape so the currently-failing two-button count assertion goes green.

**Blocked by:** None (can start immediately). Independent of ticket 01 — different seam.

**Status:** ready-for-agent

- [ ] Rendering spec asserts exactly one submit button per match row (14 rows → 14 buttons), not two
- [ ] Rendering spec asserts the chosen team appears as a hidden form field in every match form
- [ ] Per-row player-roster hidden fields unchanged (3 players × 14 rows) and opponent teamtable threading intact
- [ ] Change-mode context (session id + owner password) still threaded into forms and back link
- [ ] Empty-state (no matches) spec unaffected

## Comments
