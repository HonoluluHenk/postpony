## Purpose

Voting lets participants signal availability on proposed dates (Yes / No / IfNecessary) and lets the two captains steer which dates are polled, accepted, and finally confirmed. It is the section where the organizer's symmetric votable switch, the opponent's per-team Votable and Accepted switches, tallies, and the confirm/reopen lifecycle meet.

## Requirements

### Requirement: A vote is per participant per Proposed Date

A Vote SHALL record one Proposed Date, one Participant, and one value: `Yes`, `No`, or `IfNecessary`. There SHALL be at most one Vote per Participant per Proposed Date; re-voting SHALL update the existing Vote instead of adding a second.

#### Scenario: First vote

- **WHEN** a participant votes `Yes` on a Proposed Date
- **THEN** one Vote of type `Yes` is recorded for that participant and date

#### Scenario: Re-vote updates

- **WHEN** a participant who already voted on a date submits a different value
- **THEN** their single Vote is updated to the new value, not duplicated

#### Scenario: IfNecessary value

- **WHEN** a participant chooses "if necessary" / "notfalls"
- **THEN** their Vote is recorded as `IfNecessary`, distinct from `Yes`, `No`, and an abstention

### Requirement: Votability of Proposed Dates

A Proposed Date SHALL be `votable` (the organizer's symmetric switch, on by default) to appear in either team's poll; non-votable dates SHALL be hidden from both polls and SHALL NOT be confirmable. A Proposed Date may additionally carry `opponentVotable` to appear in the opponent team's poll specifically; a date that is not votable SHALL NOT be shown in any poll even if still in the opponent set.

#### Scenario: Organizer closes a date to both teams

- **WHEN** the organizer turns a date's `votable` switch off
- **THEN** the date is hidden from both teams' polls
- **AND** the date cannot be confirmed

#### Scenario: Organizer reopens a date

- **WHEN** the organizer turns a date's `votable` switch back on
- **THEN** the date is polled again by the teams it was not separately excluded from

### Requirement: Opponent Votable per team

The opponent captain SHALL have a per-date `opponentVotable` switch (on by default) controlling only whether their own team may vote on that date. Turning it off SHALL remove the date from the opponent team's poll only — the organizer's symmetric `votable` switch stays untouched — and SHALL block confirmation. The switch SHALL be a no-op on a date the organizer has made non-votable.

#### Scenario: Opponent takes a date out of their poll

- **WHEN** the opponent captain turns `opponentVotable` off on a votable date
- **THEN** the date is hidden from the opponent team's poll only
- **AND** the organizer's symmetric `votable` flag is unchanged
- **AND** the date cannot be confirmed

#### Scenario: Opponent switch on a non-votable date

- **WHEN** the opponent captain toggles `opponentVotable` on a date the organizer has made non-votable
- **THEN** nothing changes

### Requirement: Accepted dates are confirmable

The opponent captain SHALL mark a Proposed Date `accepted` (off by default) after their team has voted; organization success — the organizer confirming the new date — SHALL be restricted to dates that are `votable`, remain in the opponent's poll (`opponentVotable`), and are `accepted`.

#### Scenario: Confirmation requires accepted

- **WHEN** the organizer confirms a date
- **THEN** the confirmation succeeds only if the date is votable, opponentVotable, and accepted
- **AND** an invalid confirmation is a no-op with a clear message

#### Scenario: Opponent accepts a date

- **WHEN** the opponent captain turns `accepted` on for a date
- **THEN** the date becomes confirmable (provided it is votable and in the opponent poll)

### Requirement: Tally per date

The system SHALL aggregate Votes per Proposed Date into per-value counts (Yes / No / IfNecessary), optionally separately per team.

#### Scenario: Tally counts votes

- **WHEN** votes exist on a date
- **THEN** the tally shows Yes, No, and IfNecessary counts for that date
- **AND** per-team tallies are available where the view is team-scoped

### Requirement: Confirm and reopen

Confirming a Proposed Date SHALL lock it: sets `confirmedProposedDateId` and moves the Postponement to `Confirmed`. Reopening a Confirmed Postponement SHALL return it to `Voting`, increment `reopenCount`, and preserve history, votes, and flags (see postponement).

#### Scenario: Confirm success

- **WHEN** the organizer confirms a valid (votable, opponentVotable, accepted) date
- **THEN** the Postponement is `Confirmed` with that date as the confirmed id

#### Scenario: Confirm is a no-op otherwise

- **WHEN** the organizer confirms a date that is not votable, not in the opponent poll, or not accepted
- **THEN** nothing changes and a clear message explains why

#### Scenario: Reopen after confirm

- **WHEN** the organizer reopens a Confirmed Postponement
- **THEN** voting is re-enabled and the previous confirmed date remains as history

### Requirement: Own-team results

The edit page SHALL show the organizer's own team's Votes per date so the organizer sees their side's availability.

#### Scenario: Own team votes visible on edit page

- **WHEN** the organizer views the edit page
- **THEN** their own team's votes are shown per votable date