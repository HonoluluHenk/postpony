## Purpose

Match Format describes how many players a side must field for a Match — `maxPlayers` at full strength, `minPlayers` at its smallest still-playable side — under a profile name. Every Postponement carries one, defaults to the standard profile, and its availability grouping of Proposed Dates is derived from it. The format gates nothing: it drives the availability grouping only (ADR-0027).

## Requirements

### Requirement: A Postponement carries a match format

Every Postponement SHALL carry a Match Format with `minPlayers`, `maxPlayers`, and a profile `name`. New Postponements SHALL receive the default profile (minPlayers 2, maxPlayers 3, name "STT Mannschaft" — full strength 3, smallest side 2 for table tennis).

#### Scenario: Default format at creation

- **WHEN** a Postponement is created
- **THEN** it carries the default match format (min 2, max 3)

### Requirement: The format drives availability grouping only

The Match Format SHALL be used only to group Proposed Dates by availability (e.g. whether the fielded side is at full or reduced strength). It SHALL NOT gate proposal, voting, confirmation, or any other behavior.

#### Scenario: Format markers grouping

- **WHEN** proposed dates are grouped by availability
- **THEN** the grouping follows the min/max player counts of the match format

#### Scenario: Format does not gate voting

- **WHEN** a side has fewer players than the format's max
- **THEN** voting and confirmation are unaffected by the format