## Purpose

The opponent page is the scoped control surface for the captain of the team that is not the organizer's. Through it the opponent captain manages their own team's roster, turns their team's per-date Votable off, marks dates Accepted, shares their own team's player invitation link, and triggers a schedule re-check that refreshes only their side's clash lines.

## Requirements

### Requirement: Opponent captain has scoped rights

The opponent captain (the captain of the side opposite `organizerTeam`) SHALL authenticate with the opponentCaptain password and SHALL get edit rights over their own team only: altering opponent Players, turning a Proposed Date's `opponentVotable` off, and marking dates `accepted`. The opponent captain SHALL NOT be able to propose dates, flip the symmetric `votable` switch, or confirm a date.

#### Scenario: Opponent edits own team only

- **WHEN** the opponent captain acts on the opponent page
- **THEN** their changes are limited to opponent-team players, `opponentVotable`, and `accepted`
- **AND** proposing dates, the organizer's votable switch, and confirmation are not offered

#### Scenario: Wrong password on the opponent page

- **WHEN** someone accesses opponent-scoped actions without the opponentCaptain password
- **THEN** the actions are refused

### Requirement: Own-team invitation link

The opponent page SHALL share only the opponent team's player-invitation link (carrying the away/home team player token, ADR-0013), so the opponent captain invites only their own players.

#### Scenario: Opponent shares their link

- **WHEN** the opponent captain copies an invitation from the opponent page
- **THEN** the link uses their own team's player password token

### Requirement: Opponent sees own team's clash lines

The opponent page SHALL show only the opponent team's Clash lines on each votable Proposed Date — never the organizer team's — and SHALL show a "No other games" chip when the opponent side is checked and clean. The vote page SHALL show no clash lines at all; the edit page shows both teams' lines.

#### Scenario: Own clashes only

- **WHEN** the opponent captain views a Proposed Date on the opponent page
- **THEN** they see only their team's Clash lines
- **AND** the organizer team's lines are never shown there

#### Scenario: Clean opponent side

- **WHEN** a schedule check found no games for the opponent team on a date
- **THEN** the opponent page shows a "No other games" chip for that date

### Requirement: Opponent-triggered refresh of own side

The opponent page SHALL allow the opponent captain to trigger a schedule re-check that refreshes only their own side's Clash lines; when the opponent sits on the home side, the refresh SHALL also update Venue Occupancy for the checked dates.

#### Scenario: Refresh from the opponent page

- **WHEN** the opponent captain triggers a schedule re-check
- **THEN** only their own team's Clash lines are refreshed
- **AND** Venue Occupancy is refreshed as well when the opponent team is the home side

#### Scenario: Refresh failure never blocks saving

- **WHEN** a schedule check fails transiently
- **THEN** the Proposed Dates keep their last clash data and the Postponement carries `clashDataStale` until the next successful check