# 03: Venue occupancy on the edit page

**What to build:** The tracer bullet — proposing a date on the edit page shows, per Proposed Date, how many of the club's other home Matches fall at that date's Venue around that time, refreshed with the clash snapshot, so the organizer can see whether the hall is busy at a glance.

**Blocked by:** 01, 02, and the venues feature: venues 01 (venueNumber on ProposedDate + venues on Postponement), venues 02 (real home club id on the Postponement), venues 03 (single-date form records the venue number)

**Status:** ready-for-agent

- [ ] `computeClashesForSession` fires a third parallel fetch (`fetchClubMeetings` for the home club id, season window from the championship) and attaches a Venue Occupancy snapshot to each Proposed Date alongside its `clashes`
- [ ] The existing two-team clash logic is unchanged; a failed occupancy scrape degrades gracefully — occupancy stays absent, clashes still attach, dates still save
- [ ] The edit page proposed-date list renders a count line per date (e.g. "N weitere Spiele an diesem Ort"); a clean/zero occupancy renders a clean line; absent data (hand-entered match, failed scrape) renders nothing
- [ ] The manual refresh action recomputes the occupancy snapshot in the same pass as the clash snapshot
- [ ] Localization keys added to en/de (fr/it reuse English per ADR-0016)
- [ ] Route tests (mocked scraper): occupancy attached per proposed date; a failed occupancy scrape still saves dates and still attaches clashes; refresh updates the snapshot
- [ ] E2E on the edit flow: propose a date and see the occupancy count render
- [ ] Prior art: `edit-handlers.spec.ts` (mocked-scraper wiring), `clash-checks.e2e.ts` (full flow)