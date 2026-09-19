## Purpose

Proposed dates are the organizer's candidate new times for the postponed match, produced either one at a time or through the fixed Monday–Sunday generator. Each date is anchored inside the planning window, may reference a venue, and carries the three flags (votable, opponentVotable, accepted) that the voting and confirmation logic depends on.

## Requirements

### Requirement: A Proposed Date is anchored in time and place

A Proposed Date SHALL carry a `dateTimeRange` (start and end), the id of its proposer, and optionally a `venueNumber` referencing one of the Postponement's snapshotted venues (absent means venue 1). It SHALL also carry three flags: `votable`, `opponentVotable`, and `accepted`.

#### Scenario: New date proposal

- **WHEN** an organizer proposes a date
- **THEN** the date stores its start and end time and the organizer as proposer
- **AND** the date is votable by default, opponentVotable by default, and not yet accepted

#### Scenario: Venue assignment

- **WHEN** the organizer assigns a venue number to a Proposed Date
- **THEN** the date references that venue from the Postponement's locked venue list

### Requirement: Proposed Dates Generator

The edit page SHALL offer the Proposed Dates Generator: a fixed Monday–Sunday grid in which each day either yields one Proposed Date inside the planning window (anchored on the match's `originalMatchDateTime`) or is skipped when left empty. The weekdays SHALL be locked on Monday–Sunday: they cannot be added, removed, or re-labelled (ADR-0021).

#### Scenario: Generating the weekly slate

- **WHEN** the organizer enters a time for some days of the grid and submits
- **THEN** a Proposed Date is created for each populated day, anchored inside the planning window
- **AND** empty rows are skipped, producing no dates

#### Scenario: Weekdays are fixed

- **WHEN** the generator is displayed
- **THEN** the grid always offers the same Monday–Sunday days
- **AND** the organizer cannot add, remove, or rename a weekday

### Requirement: Planning window

Proposed Dates SHALL be placeable only within the planning window: the match's `originalMatchDateTime` plus a fixed forward horizon of 4 weeks (`MAX_FORWARD_WEEKS_FROM_ORIGINAL`). Dates outside this range SHALL NOT be created.

#### Scenario: Date outside the window is rejected

- **WHEN** the organizer proposes a date beyond 4 weeks from the original match time
- **THEN** the date is not created and the UI explains the constraint

### Requirement: Delete a Proposed Date cascades

Deleting a Proposed Date SHALL cascade-delete its Votes and clear a dangling `confirmedProposedDateId` if that date was the confirmed-history date. Deleting an unknown date id SHALL be a no-op that leaves status untouched.

#### Scenario: Delete cascades votes

- **WHEN** the organizer deletes a Proposed Date that has votes
- **THEN** the date and its votes are removed
- **AND** the Postponement status is left as it was

#### Scenario: Deleting the confirmed-history date

- **WHEN** the organizer deletes the date referenced by `confirmedProposedDateId`
- **THEN** the `confirmedProposedDateId` reference is cleared
- **AND** the status is left as it was

#### Scenario: Unknown date id

- **WHEN** the organizer deletes a date id that does not exist
- **THEN** nothing changes

### Requirement: Generator days and times are remembered per team

The Proposed Dates Generator SHALL remember the organizer team's last-used weekday times and Venue selection on the device in use, scoped to that team through its click-tt Team Identity, and SHALL prefill the Monday–Sunday grid and the Venue selector with the remembered values when the generator is next shown for that team. The remembered values SHALL be independent of the display Locale: time tokens captured under one Locale MUST re-render under any other Locale as the same wall-clock time. When the organizer team has no click-tt Team Identity, the generator SHALL NOT prefill.

#### Scenario: Times and venue prefill on the next visit

- **WHEN** an organizer has submitted the generator for a team and later opens the edit page of the same team again
- **THEN** the generator grid shows the previously used weekday times in the current Locale's time-token format
- **AND** the Venue selector shows the previously used Venue when it is still part of the Postponement's Venue list

#### Scenario: The memory follows the team, not the side

- **WHEN** the same team is the organizer's team in two Postponements and on different sides (home and away)
- **THEN** the day and time values remembered from the first Postponement prefill the generator in the second

#### Scenario: Same slate renders in any Locale

- **WHEN** a slate was captured for a team under one Locale and the generator is next shown under a different Locale on the same device
- **THEN** every remembered weekday time appears in the current Locale's time-token format and represents the same wall-clock time

#### Scenario: Remembered Venue no longer exists

- **WHEN** the remembered Venue number is not present in the Postponement's Venue list
- **THEN** the Venue selector keeps its default option
- **AND** the remembered weekday times still prefill

#### Scenario: Clearing every time forgets the slate

- **WHEN** an organizer clears every weekday time in the grid and submits the generator
- **THEN** the generator no longer prefills weekday times on a later invocation for that team

#### Scenario: No team identity means no memory

- **WHEN** the organizer team has no click-tt Team Identity
- **THEN** the generator does not prefill the grid on any invocation