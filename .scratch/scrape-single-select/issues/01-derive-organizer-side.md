# 01: Derive organizer side server-side

**What to build:** Creating a Postponement from a scraped Match treats the organizer's chosen team (carried from the teams step) as a required, non-empty form field. The create-from-scrape POST handler derives `organizerTeam` by comparing that team name against the row's home and guest team names — 'home' on match, otherwise 'away' — replacing the old optional field with its silent away fallback. A missing or empty team name surfaces through the standard missing-parameter failure. Change mode keeps its existing contract: same session id, preserved passwords/votes/Proposed Dates, rosters and `organizerTeam` replaced.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Handler schema requires the submitted team name as non-empty; absent name rejects with the standard missing-parameter error instead of defaulting to 'away'
- [ ] Chosen team listed as home side stores `organizerTeam: 'home'`; chosen team listed as guest side stores `'away'`
- [ ] Both derivations covered at the mock-App handler seam (prior art: existing match-create POST unit spec)
- [ ] Missing-team-name rejection covered
- [ ] Change-mode spec still passes unchanged (rosters replaced, id/passwords/votes/proposed dates preserved)

## Comments
