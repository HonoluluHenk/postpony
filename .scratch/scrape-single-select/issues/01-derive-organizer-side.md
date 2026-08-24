# 01: Derive organizer side server-side

**What to build:** Creating a Postponement from a scraped Match treats the organizer's chosen team (carried from the teams step) as a required, non-empty form field. The create-from-scrape POST handler derives `organizerTeam` by comparing that team name against the row's home and guest team names — 'home' on match, otherwise 'away' — replacing the old optional field with its silent away fallback. A missing or empty team name surfaces through the standard missing-parameter failure. Change mode keeps its existing contract: same session id, preserved passwords/votes/Proposed Dates, rosters and `organizerTeam` replaced.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Handler schema requires the submitted team name as non-empty; absent name rejects with the standard missing-parameter error instead of defaulting to 'away'
- [x] Chosen team listed as home side stores `organizerTeam: 'home'`; chosen team listed as guest side stores `'away'`
- [x] Both derivations covered at the mock-App handler seam (prior art: existing match-create POST unit spec)
- [x] Missing-team-name rejection covered
- [x] Change-mode spec still passes unchanged (rosters replaced, id/passwords/votes/proposed dates preserved)

## Comments

- Schema change only: `teamName` went from `v.optional(v.string(), '')` to `v.pipe(v.string(), v.minLength(1))` in `MatchSchema`; the existing derivation line (`m.teamName === m.homeTeam ? 'home' : 'away'`) already implements "home on match, otherwise away" once the fallback default is gone.
- Added specs: absent team name rejects, empty team name rejects. The two change-mode guard specs (wrong owner password, missing session) needed a valid `teamName` in their fixtures now that schema validation precedes those guards.
- Lint clean; full suite 307 tests / 30 files green; coverage identical to baseline (global 87.0% stmts / 78.0% branch, match-post.ts 80.4%/69.2% — remaining gaps are pre-existing network-fetch, owner-password-missing, and HX-partial branches).
- Not touched (other tickets): matches.tsx buttons, locale keys, page objects, e2e.
