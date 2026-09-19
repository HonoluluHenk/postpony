## Purpose

Participant identity is how a roster Player joins a Postponement and votes, without any account system: they open their team's player-invitation link carrying a `?token=`, and their identity is held per-postponement per-team on their device in localStorage. Switch Participant lets a different roster Player join from the same device.

## Requirements

### Requirement: Join through the team's player-password link

A Participant SHALL join a Postponement via the URL `/join/:id/:team` combined with their team's player-password token (`?token=`). The token SHALL be the team's player password (per-team secret, home or away), granting vote access for that team only. A join without a valid token for the target team SHALL be refused.

#### Scenario: Player joins their team

- **WHEN** a Player opens their team's player-invitation link with a valid token
- **THEN** they can join that team as a Participant and vote

#### Scenario: Wrong team token

- **WHEN** a Player uses the home team's token on the away team's link
- **THEN** the join is refused

#### Scenario: Missing or invalid token

- **WHEN** a Player opens a join link without a valid token
- **THEN** the join is refused and they cannot vote

### Requirement: Per-team invitation links

Each Postponement SHALL offer separate player-invitation links for the home and away teams, each carrying that team's own player-password token, so a captain invites only their own players (ADR-0013).

#### Scenario: Captains share their team's link

- **WHEN** a captain shares an invitation
- **THEN** the link contains their own team's token
- **AND** it works only for that team's poll

### Requirement: Identity is device-local

A Participant's identity SHALL be held per-postponement per-team in `localStorage` under the key `postpony-player-<sessionId>-<team>` — not in cookies or a login session. A device SHALL hold at most one Participant identity per team.

#### Scenario: Identity persisted on the device

- **WHEN** a Player joins a team
- **THEN** their player id is stored under the per-postponement per-team localStorage key
- **AND** the same device later returns as that Participant

#### Scenario: One identity per team per device

- **WHEN** a device already holds a Participant for a team
- **THEN** that is the identity voting on that team; a second join replaces it

### Requirement: Switch Participant

The system SHALL offer a Switch Participant control that drops the device's stored identity for that team, so a different roster Player can join from the same device. There SHALL be no "logout": switching only removes the device-local identity (ADR-0013). Votes already cast SHALL stay with the outgoing Participant.

#### Scenario: Switching identity

- **WHEN** a Participant uses Switch Participant
- **THEN** their device-local identity for that team is removed
- **AND** they can join as a different roster Player
- **AND** previously cast votes remain attributed to the outgoing Participant

### Requirement: Participants come from the roster

A Player SHALL be a roster Player of the team they join (`id`, `name`, `teamId` from the scraped or captain-added roster); every Vote and availability record SHALL reference a Participant by `participantId`.

#### Scenario: Voting requires a joined Participant

- **WHEN** a device votes without a stored Participant identity
- **THEN** the vote is not recorded
- **AND** the user is guided to join via the team link first