# 02: Scrape venues from click-tt club page

**What to build:** Scrapes the home team's club venue list from click-tt.ch when creating a Postponement via the click-tt flow, so that newly created sessions carry the club's venue names and addresses.

**Blocked by:** 01 (needs `Venue` type and `venues` field on Postponement)

**Status:** ready-for-agent

- [x] Add `fetchVenues(clubId)` function to `src/lib/click-tt-scraper.ts` that scrapes `clubInfoDisplay?club=<id>` and returns `Venue[]`
- [x] Add `extractClubId(root)` helper to `src/lib/click-tt-scraper.ts` that extracts the **home team's** club ID from the team page HTML (the postponed match row's `Ort` cell, which carries the home club id; equals the organizer's club when the organizer is the home team)
- [x] Add `clubInfoDisplay` branch to `fixtureNameForUrl` for fixture mapping
- [x] Create `club-venues.html` fixture file with a realistic club info page containing venue listings
- [x] Wire venue scraping into `match-post.ts` as an additional parallel `Promise.all` entry alongside player scraping; persist the home club id on `Postponement.clubId` (replacing the `DEFAULT_CLUB_ID` placeholder)
- [x] Venue scraping runs only when a `clubId` is available; otherwise `venues` stays `[]`
- [x] Add unit tests for `fetchVenues` against the `club-venues.html` fixture
- [x] Add unit tests for `extractClubId` against existing `team.html` fixtures
- [x] Manual Postponement creation still sets `venues: []` and keeps `clubId` unset
- [x] All existing unit tests pass

## Comments

- Amended after review: the venue list and club id belong to the **home team's club**, not the organizer's (the rescheduled match is played at the home team's hall). Drives the venue-occupancy feature (`.scratch/venue-occupancy/`).
- Reworked to the amended spec (`ticket done: 02-scrape-venues-from-clicktt`): `extractClubId` now locates the postponed match's row (matched by date/time/home/guest) and reads its `Ort` cell club link — the home club id; `match-post.ts` persists that id on `Postponement.clubId`. Commits: `3bff844`, `852c6b7` (original) plus the rework commits listed below.