# 02: Match-list renders one select per row

**What to build:** The match-list step of the scrape wizard renders exactly one submit button per Match row, labelled with the generic select key ("Select" / "Auswählen"), with the organizer's chosen team threaded into every row's form as a hidden field alongside the existing match fields. The wizard rendering spec asserts this new shape so the currently-failing two-button count assertion goes green.

**Blocked by:** None (can start immediately). Independent of ticket 01 — different seam.

**Status:** done

- [x] Rendering spec asserts exactly one submit button per match row (14 rows → 14 buttons), not two
- [x] Rendering spec asserts the chosen team appears as a hidden form field in every match form
- [x] Per-row player-roster hidden fields unchanged (3 players × 14 rows) and opponent teamtable threading intact
- [x] Change-mode context (session id + owner password) still threaded into forms and back link
- [x] Empty-state (no matches) spec unaffected

## Comments

- `matches.tsx`: one `scrape_select` button per row (no name/value); `<input type="hidden" name="teamName">` added to every match form alongside existing fields. Roster/opponentTeamtable/change-mode threading untouched.
- Locales: removed `scrape_create_as_home` / `scrape_create_as_away`, added `scrape_select` ("Select" / "Auswählen") in en+de; fr/it fall back to en per ADR-0016.
- Spec updated TDD-first (red: 28 vs expected 14 buttons, missing hidden teamName → green). ScrapePage page object still locates by hardcoded "Create as <team>" string — runtime-only concern, no compile impact; e2e updates are ticket 03's job.
- Full suite: 307 passed; lint clean. Branch coverage 77.97% equals pre-change baseline (pre-existing gap on this branch, untouched files).

