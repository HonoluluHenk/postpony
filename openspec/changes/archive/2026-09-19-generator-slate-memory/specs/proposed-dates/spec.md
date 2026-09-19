## ADDED Requirements

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