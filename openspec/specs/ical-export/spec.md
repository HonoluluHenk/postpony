## Purpose

iCal Export provides an RFC 5545 calendar feed of a Postponement's votable Proposed Dates, with per-date one-click vote links, so participants can import the poll into their calendar app and vote from there (ADR — iCal feed at the edit and join endpoints).

## Requirements

### Requirement: iCal feed of votable dates

The system SHALL expose the votable Proposed Dates of a Postponement as an RFC 5545 calendar feed, with each event carrying its date/time range and a one-click vote link. The feed SHALL be available from the edit endpoint and the join endpoint.

#### Scenario: Export from the edit view

- **WHEN** the organizer requests the iCal feed from the edit view
- **THEN** the response is a valid RFC 5545 feed listing the votable Proposed Dates
- **AND** each event links back so a participant can open the vote page for that date

#### Scenario: Export from the join view

- **WHEN** a participant requests the iCal feed from the join/view view
- **THEN** the response is a valid RFC 5545 feed of the votable dates they are eligible to vote on

### Requirement: Per-date vote links

Each feed event SHALL carry per-date vote links (open poll, yes, if-necessary, no) so a participant can make their choice from the calendar event.

#### Scenario: Event carries vote links

- **WHEN** a participant opens an imported calendar event
- **THEN** it offers links to open the poll and to vote Yes / IfNecessary / No for that specific date