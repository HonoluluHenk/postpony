# 03: Venue occupancy on the edit page

**What to build:** The tracer bullet — proposing a date on the edit page shows, per Proposed Date, how many of the club's other home Matches fall at that date's Venue around that time, refreshed with the clash snapshot, so the organizer can see whether the hall is busy at a glance.

**Blocked by:** 01, 02, and the venues feature: venues 01 (venueNumber on ProposedDate + venues on Postponement), venues 02 (real home club id on the Postponement), venues 03 (single-date form records the venue number)

**Status:** ready-for-agent

- [x] `computeClashesForSession` fires a third parallel fetch (`fetchClubMeetings` for the home club id, season window from the championship) and attaches a Venue Occupancy snapshot to each Proposed Date alongside its `clashes`
- [x] The existing two-team clash logic is unchanged; a failed occupancy scrape degrades gracefully — occupancy stays absent, clashes still attach, dates still save
- [x] The edit page proposed-date list renders a count line per date (e.g. "N weitere Spiele an diesem Ort"); a clean/zero occupancy renders a clean line; absent data (hand-entered match, failed scrape) renders nothing
- [x] The manual refresh action recomputes the occupancy snapshot in the same pass as the clash snapshot
- [x] Localization keys added to en/de (fr/it reuse English per ADR-0016)
- [x] Route tests (mocked scraper): occupancy attached per proposed date; a failed occupancy scrape still saves dates and still attaches clashes; refresh updates the snapshot
- [x] E2E on the edit flow: propose a date and see the occupancy count render
- [x] Prior art: `edit-handlers.spec.ts` (mocked-scraper wiring), `clash-checks.e2e.ts` (full flow)

## Comments

- 6cb6a72 (ticket done): `computeClashesForSession` fires a third parallel `fetchClubMeetings` (home club id, `seasonWindow` from the home championship) and attaches a `venueOccupancy` snapshot per Proposed Date alongside `clashes` (own failure isolation via `.catch`); edit-page list renders the count line / clean line / nothing through a new `VenueOccupancyInfo` partial (mirrors `ClashInfo`); manual refresh recomputes both snapshots in the same pass; `session-store.normalize` round-trips the new field; `venue_occupancy_line`/`venue_occupancy_clean` added to en/de. Route tests (mocked scraper) cover occupancy attach, failed-scrape degradation, club-id-less skip, clean line, and refresh update; section rendering tests cover en/de; e2e scrapes the Ostermundigen return match and asserts the occupancy count renders. Lint clean, 577 unit tests pass (coverage ≥80% all metrics), 88 e2e tests pass.