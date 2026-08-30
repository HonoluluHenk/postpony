# Spec: Venue Occupancy

Status: ready-for-agent

## Problem Statement

When proposing dates for a postponed match, the organizer sees Clashes against the two teams' schedules, but nothing about the physical hall. The rescheduled match is played at a Venue of the home club; that hall may already host other Matches of the club's other teams (or the same team) at overlapping times. The organizer currently has no way to see whether the hall is free on a proposed date.

## Solution

Show, per Proposed Date, how many of the home club's home Matches are already scheduled at that date's Venue around that time ("Venue Occupancy"), alongside the existing Clashes. The count is informational only — it never auto-deselects a date. Hovering the count reveals the conflicting Matches (opponent + time) in a tooltip.

## User Stories

1. As an organizer proposing dates for a postponed match, I want to see how many of my club's other home matches fall at the same venue around the same time as each proposed date, so that I can avoid proposing a time when the hall is busy
2. As an organizer, I want the count shown on every proposed date in the edit page list, so that I can compare hall availability across candidate times at a glance
3. As an organizer, I want to hover the count to see which matches conflict (opponent and time), so that I can judge whether the conflict is real
4. As a participant voting on the poll, I want to see the same count on each proposed date, so that I can weigh hall availability when voting
5. As an organizer, I want the count to reflect the actual hall where the rescheduled match is played — the home team's club venues — so that the signal is about the right building
6. As an organizer, I want only home matches (matches played at the home club's own halls) counted, so that away games (played at opponents' halls) don't inflate the count
7. As an organizer, I want the count to be informational only: a busy hall never auto-deselects my proposed date, so that I stay in control
8. As an organizer, I want the occupancy refreshed together with the clash snapshot (manual refresh), so that the data stays current as the season's schedule changes
9. As an organizer, I want a proposed date whose hall shows no occupancy to render clean (like "checked, no clashes"), so that I can tell the check ran
10. As an organizer, I want no occupancy shown when the feature can't run (e.g. a hand-entered match without a club id), so that the UI doesn't mislead
11. As an organizer, I want Matches without a venue number (a league click-tt never assigns a hall to) excluded from the count, so that the count never guesses a venue
12. As an organizer, I want the postponed Match itself excluded from the count, so that the game being rescheduled isn't counted as occupying its own new date

## Implementation Decisions

### Data source: the clubMeetings endpoint

- New scraper function `fetchClubMeetings(clubId, from, to)` fetches `clubMeetings?club=<id>&searchType=1&searchTimeRangeFrom=<from>&searchTimeRangeTo=<to>&onlyHomeMeetings=true` (GET) and returns the club's home Matches — `onlyHomeMeetings=true` filters server-side to matches where the club is the home team.
- The `from`/`to` window is derived from the postponed Match's season: championship "MTTV 26/27" → `01.07.2026`..`30.06.2027` via a pure helper (seasons run Aug→Jul).
- The scraper `Match` type gains an optional `venueNumber?: number` parsed from the `Ort` cell link (`(n)`); rows without a venue link yield `undefined` and are excluded from counts.
- `fixtureNameForUrl` gains a `clubMeetings` branch; a new `club-meetings.html` fixture is anchored on Ostermundigen (club 33282) with home + away rows and at least one venue-less row.

### Whose hall / club id

- Venue Occupancy is always computed for the **home team's club** (ADR-0001 single-club model). The venues feature is amended accordingly: the Venue list snapshotted on the Postponement is the home club's, and `Postponement.clubId` carries the real home club id (replacing the `DEFAULT_CLUB_ID` placeholder) once the venues feature lands.
- The home club id is derived at creation from the wizard's team page: the postponed Match's row `Ort` cell carries the home club id (zero extra requests). When the organizer is the home team it equals the organizer's club id. Rare fallback: the row lacks a venue link and the organizer is away → scrape the home team's `teamPortrait` (its `teamtable` is known) for the club id.

### Computation

- New pure module with `computeVenueOccupancy(proposedDates, homeMatches, originalMatch)` returning, per Proposed Date, the count of home Matches whose `venueNumber` matches the date's venue (`venueNumber ?? 1`) and whose start falls within `[proposedStart − CLASH_BUFFER_HOURS, proposedEnd + CLASH_BUFFER_HOURS]`; the postponed Match is excluded, venue-less Matches skipped. Reuses the buffer/window helpers already used by `computeClashes`.
- Result type carries the count plus the conflicting Matches, e.g. `VenueOccupancy { count: number; matches: { opponent: string; start: string }[] }`, snapshotted per Proposed Date.

### Wiring

- `computeClashesForSession` gains a third parallel fetch (`fetchClubMeetings` for the home club id) and attaches the occupancy snapshot to each Proposed Date alongside `clashes`. The existing two-team clash logic is unchanged; a failed occupancy scrape degrades gracefully (occupancy stays absent, clashes still attach, dates still save).
- The manual refresh handler recomputes both snapshots in the same pass.
- Hand-entered Postponements have no club id → no occupancy (rendered like "not checked").

### Presentation

- The edit page proposed-date list and the participant poll view show a count line per Proposed Date, rendered by the shared clash-info component pattern.
- The conflicting Matches (opponent + time) are revealed in a tooltip/popup on the count; a zero/clean occupancy renders a clean line (or nothing when the check can't run).
- Localization keys added to `en.json`/`de.json`; fr-CH/it-CH reuse English per ADR-0016.

## Testing Decisions

- A good test asserts external behavior only (given a proposed date and a home schedule, the right count and conflicting Matches come out), never HTML-parsing internals.
- Seams (existing where possible, highest point):
    - the pure `computeVenueOccupancy` — the single logic seam, no I/O,
    - `fetchClubMeetings` against the `club-meetings.html` fixture — scraper output contract, like `fetchMatches`,
    - the `computeClashesForSession` wiring in route tests (mock the scraper): occupancy attached per proposed date; a failed occupancy scrape still saves dates and still attaches clashes,
    - e2e through the edit page and poll view: count renders, tooltip shows the Matches.
- Modules tested: the new occupancy module (unit), `click-tt-scraper.spec.ts` (`fetchClubMeetings`), `edit-handlers.spec.ts` (wiring/snapshot), and a `clash-checks.e2e.ts`-style e2e.
- Prior art: `clashes.spec.ts` (pure buffer-window logic), `click-tt-scraper.spec.ts` (fixture-driven scrape), `edit-handlers.spec.ts` (mocked-scraper wiring), `clash-checks.e2e.ts` (full flow).

## Out of Scope

- Auto-deselecting Proposed Dates on occupancy (informational only).
- Venue-specific Clash computation (Clashes stay time-only, venue-agnostic).
- Occupancy for the away club's hall, or for the organizer's club when it differs from the home club.
- Editing the Venue list after creation (locked, per the venues spec).
- Storing the original Match's venue.

## Further Notes

- 5 of 74 home rows on the live Ostermundigen page lack a venue link (all `DA 1.Liga`); these are excluded, not guessed.
- A proposed date in the next season counts nothing because next season's fixtures aren't scheduled in click-tt yet (correctly empty).
- Glossary updated: `Venue` and `Venue Occupancy` added to `CONTEXT.md`.
- This feature builds on the venues feature (`.scratch/venues/`); the venues spec is amended so the venue list and club id are the home team's.
