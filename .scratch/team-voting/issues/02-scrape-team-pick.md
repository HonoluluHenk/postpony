# 02 — Scrape wizard: pick your side per match

**What to build:** the organizer chooses which side of a match is theirs when creating a postponement from the scrape wizard. Each match row in the match list renders two create buttons instead of one — one labelled with the home team's name, one with the guest team's ("Create as <home team>" / "Create as <guest team>"). Both buttons post to the existing match-create action with the same hidden fields; the chosen side is carried by the existing team-name form field. The created session stores `organizerTeam` as the chosen side, and both rosters are scraped exactly as today (organizer side from the selected players, opponent side from the opponent team table). Session name, passwords, and metadata are unchanged. Two new locale keys label the two buttons.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Match list shows two create buttons per match row, each labelled with the respective team name.
- [ ] Picking the home side creates a session with `organizerTeam: 'home'`; picking the guest side creates `organizerTeam: 'away'`.
- [ ] Both rosters are still scraped into the session (organizer side + opponent side) for either choice.
- [ ] Non-scrape (manual) creation also writes `organizerTeam` per the migration default.
- [ ] e2e: scrape wizard shows two buttons per match; creating via each side sets the matching `organizerTeam`.
- [ ] Unit tests cover the organizer-team derivation for both sides.