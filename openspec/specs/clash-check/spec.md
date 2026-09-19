## Purpose

Clash-check detects whether a Proposed Date collides with the two teams' schedules or with home-club venue usage: a Clash is another scheduled Match of the home or guest team whose start falls inside the date range plus a two-hour buffer, and Venue Occupancy counts the home club's home Matches booked at the referenced Venue in the same window. Clashes drive auto-deselection, Venue Occupancy is informational only.

## Requirements

### Requirement: Clash window

A Clash SHALL be any scheduled Match of the home or guest team whose start falls within a Proposed Date's `dateTimeRange` extended by `CLASH_BUFFER_HOURS` (2 hours) on either side; the same extended window SHALL be used for Venue Occupancy so both signals share the same edges. A game with no parsable date/time SHALL be skipped.

#### Scenario: Clash inside the buffer

- **WHEN** a scheduled Match starts within [proposedStart − 2h, proposedEnd + 2h]
- **THEN** it is reported as a Clash for the affected team

#### Scenario: Outside the window

- **WHEN** a scheduled Match starts outside the extended window
- **THEN** it is not a Clash

### Requirement: Clash attribution

Each Clash SHALL be attributed to the affected team (home or away) and SHALL carry the opponent's name and the game's start. The postponed Match itself SHALL be excluded — the game being rescheduled is never a Clash. A Postponement without team identities SHALL have no clash data.

#### Scenario: Clash on the proposed date

- **WHEN** a team has another game inside the window on the Proposed Date
- **THEN** the date's clash lines show that game, attributed to that team, with the opponent and start time

#### Scenario: The postponed match itself is excluded

- **WHEN** the schedule check considers the match being postponed
- **THEN** it is not reported as a Clash on any date

#### Scenario: No identities, no clashes

- **WHEN** a Postponement has no team identities
- **THEN** no clash data exists for any Proposed Date

### Requirement: Auto-deselect on clash

A newly proposed date that has a Clash SHALL be auto-deselected: its `votable` flag is set to false (ADR-0023), which the organizer can reverse with the votable switch. This SHALL apply only to Clashes, not to Venue Occupancy.

#### Scenario: New date clashes

- **WHEN** an organizer proposes a date and the check finds a Clash
- **THEN** the date is created non-votable
- **AND** the organizer can turn voting back on with the votable switch

#### Scenario: Venue occupancy does not deselect

- **WHEN** Venue Occupancy finds the venue busy on a date
- **THEN** the date stays votable

### Requirement: Venue Occupancy

Venue Occupancy SHALL be the count of the home club's home Matches scheduled at a Venue whose start falls within a Proposed Date's extended window. The postponed Match itself SHALL be excluded, and Matches without a venue number SHALL NOT be counted. It SHALL be informational only and SHALL NOT auto-deselect.

#### Scenario: Venue busy

- **WHEN** the home club has home Matches at the date's venue inside the window
- **THEN** the occupancy count reflects them, excluding the postponed match
- **AND** the count is shown as information, without changing votability

#### Scenario: No venue number

- **WHEN** a candidate Match has no venue number
- **THEN** it is not counted in Venue Occupancy

### Requirement: Checks happen at proposal and on refresh

Clashes and Venue Occupancy SHALL be computed when dates are proposed and again on a manual refresh (organizer on the edit page, opponent for their own side on the opponent page).

#### Scenario: Initial check on propose

- **WHEN** the organizer proposes dates
- **THEN** each date gets its clash and venue-occupancy snapshot from the scrape

#### Scenario: Manual refresh

- **WHEN** a captain triggers a schedule re-check on existing dates
- **THEN** the checked dates' snapshots are refreshed

### Requirement: Transient failure never blocks saving

A schedule check that fails transiently SHALL NOT block saving: the Proposed Dates keep their previous clash data and the Postponement SHALL carry `clashDataStale` until the next successful check clears it.

#### Scenario: Failed refresh still saves

- **WHEN** a manual refresh fails transiently
- **THEN** the dates keep their last valid clash data
- **AND** `clashDataStale` is set
- **AND** a later successful check clears `clashDataStale`