## Purpose

The Postponement is the core entity of PostPony: one postponed match, from creation as a Draft to a locked Confirmed new date, carrying its two teams, identities, passwords, players, venues, proposed dates and votes. This capability defines the entity's shape, its lifecycle state machine, and the invariants that every operation on it must preserve.

## Requirements

### Requirement: A Postponement captures one match with its two teams and original time

A Postponement SHALL permanently bind exactly one Match: its original start time (`originalMatchDateTime`), its typed `homeTeam` and `guestTeam`, and — when scraped — the click-tt Team Identities of both sides. A Postponement SHALL NOT be re-pointed at a different match after creation; the bound fixture is immutable.

#### Scenario: Creation binds the scraped fixture

- **WHEN** an organizer creates a Postponement from a scraped match
- **THEN** the Postponement stores the original match date/time and the home and guest team names
- **AND** the home and guest team identities are stored on it
- **AND** there is no operation that later changes any of these values

#### Scenario: A Postponement without team identities

- **WHEN** a Postponement is created without scraping a match
- **THEN** the teams and original match date/time are absent
- **AND** the Postponement has no clash data (a match without team identities cannot clash)

### Requirement: A Postponement is single-club

Every Postponement SHALL carry a `clubId`, defaulting to `DEFAULT_CLUB_ID` ('default-club'). The system SHALL operate as a single club; the field is retained only as a forward-compatible column (ADR-0001 withdrawn).

#### Scenario: Default club is applied

- **WHEN** a Postponement is created
- **THEN** its `clubId` is the default single club

### Requirement: A Postponement is a plain serializable object

The Postponement and all its nested entities (players, venues, proposed dates, votes) SHALL be plain, serializable objects that fit the session store unchanged (MemorySessionStore in tests, SqliteSessionStore in development and production).

#### Scenario: Storage round-trip

- **WHEN** a Postponement is saved to the session store and read back
- **THEN** all nested arrays and flags round-trip losslessly

### Requirement: Postponement lifecycle states

A Postponement SHALL be in exactly one status: `Draft`, `Voting`, or `Confirmed`. A new Postponement is a `Draft`. It enters `Voting` when the first Proposed Date is added, and again when reopened. It enters `Confirmed` when the organizer locks a Proposed Date. Reopen returns it to `Voting` and increments `reopenCount`, keeping the confirmed date as history.

#### Scenario: Draft to Voting

- **WHEN** the organizer adds the first Proposed Date to a Draft Postponement
- **THEN** the status becomes `Voting`

#### Scenario: Confirm locks a date

- **WHEN** the organizer confirms a valid Proposed Date
- **THEN** the status becomes `Confirmed`
- **AND** `confirmedProposedDateId` points at the locked date

#### Scenario: Reopen returns to Voting

- **WHEN** the organizer reopens a Confirmed Postponement
- **THEN** the status returns to `Voting`
- **AND** `reopenCount` is incremented
- **AND** the previously confirmed date, its votes, and flags are preserved as history

### Requirement: Dual-password security

A Postponement SHALL carry four generated secrets under a dual-password model (ADR-0002/0025): an `organizerCaptainPasswordHash` granting full edit access, an `opponentCaptainPasswordHash` granting opponent-captain scoped access, and separate per-team `homePlayerPasswordHash` and `awayPlayerPasswordHash` granting vote access to that team's players. All four SHALL be generated at creation; the three non-organizer plaintexts SHALL be retained so their share links can be rendered. There SHALL be no account system and no recovery.

#### Scenario: Passwords generated at creation

- **WHEN** a Postponement is created
- **THEN** all four password hashes exist
- **AND** the opponent-captain and both player plaintexts are persisted for share links
- **AND** the organizer password plaintext is not persisted

### Requirement: No pointless edits

There SHALL be no operation to change a Postponement's identity, its bound match, its club, or to delete it wholesale; edit and join operations act on the entity's parts (players, proposed dates, votes, flags).

#### Scenario: Identity is fixed at creation

- **WHEN** a Postponement exists
- **THEN** no handler exposes an operation to change its id or its bound match