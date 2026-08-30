# 01: Club schedule scraper with venue numbers

**What to build:** The scraper can fetch a club's home Matches for a season window from click-tt.ch in one request, each row carrying the venue number it is played at, so that later tickets can compute Venue Occupancy without per-team iteration.

**Blocked by:** None (can start immediately — does not need the venues feature)

**Status:** ready-for-agent

- [x] New scraper function `fetchClubMeetings(clubId, from, to)` fetches `clubMeetings?club=<id>&searchType=1&searchTimeRangeFrom=<from>&searchTimeRangeTo=<to>&onlyHomeMeetings=true` (GET) and returns the club's home Matches; `onlyHomeMeetings=true` keeps only rows where the club is the home team
- [x] The scraper `Match` type gains an optional `venueNumber?: number` parsed from the `Ort` cell link (`(n)`); rows without a venue link yield `undefined`
- [x] A pure helper derives the `from`/`to` season window from a championship (e.g. "MTTV 26/27" → `01.07.2026`..`30.06.2027`, seasons run Aug→Jul)
- [x] `fixtureNameForUrl` gains a `clubMeetings` branch for fixture mapping
- [x] New `club-meetings.html` fixture anchored on Ostermundigen (club 33282), containing home and away rows and at least one venue-less row
- [x] Unit tests: `fetchClubMeetings` against the fixture returns the expected home Matches with venue numbers; venue-less rows yield `undefined` venue; the season-window helper derives the correct window
- [x] All existing unit tests pass