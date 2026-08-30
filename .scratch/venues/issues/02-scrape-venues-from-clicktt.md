# 02: Scrape venues from click-tt club page

**What to build:** Scrapes the club's venue list from click-tt.ch when creating a Postponement via the click-tt flow, so that newly created sessions carry their club's venue names and addresses.

**Blocked by:** 01 (needs `Venue` type and `venues` field on Postponement)

**Status:** ready-for-agent

- [x] Add `fetchVenues(clubId)` function to `src/lib/click-tt-scraper.ts` that scrapes `clubInfoDisplay?club=<id>` and returns `Venue[]`
- [x] Add `extractClubId(root)` helper to `src/lib/click-tt-scraper.ts` that extracts the organizer's club ID from the team page HTML (first `a[href*="clubInfoDisplay"]` link)
- [x] Add `clubInfoDisplay` branch to `fixtureNameForUrl` for fixture mapping
- [x] Create `club-venues.html` fixture file with a realistic club info page containing venue listings
- [x] Wire venue scraping into `match-post.ts` as an additional parallel `Promise.all` entry alongside player scraping
- [x] Venue scraping runs only when a `clubId` is available; otherwise `venues` stays `[]`
- [x] Add unit tests for `fetchVenues` against the `club-venues.html` fixture
- [x] Add unit tests for `extractClubId` against existing `team.html` fixtures
- [x] Manual Postponement creation still sets `venues: []`
- [x] All existing unit tests pass

## Comments

- `3bff844` — ticket done: added `fetchVenues`/`extractClubId`/`fetchClubId` to the scraper, `club-venues.html` fixture, `clubInfoDisplay` fixture branch, venue scraping wired into `match-post.ts` as a parallel `Promise.all` entry (venues `[]` when no club id), unit tests in both specs; 537 unit tests pass (coverage ≥ 80%), lint clean, 6/6 scraping-flow e2e tests pass.