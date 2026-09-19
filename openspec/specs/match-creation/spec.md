## Purpose

Match creation is the wizard that turns a click-tt.ch fixture into a new Postponement: the organizer walks from club championship through league, group, team and match, and the scraper snapshots the team identities and home-club venues onto the Postponement. An offline Fixture Mode swaps the network for local HTML files so tests run deterministically.

## Requirements

### Requirement: Scrape-only match creation

A match for a new Postponement SHALL always be picked from scraped click-tt.ch data; there SHALL be no path that creates a Postponement by typing a match's teams and time by hand (ADR-0024, superseding the two-path creation of ADR-0017).

#### Scenario: Organizer picks a match from the wizard

- **WHEN** an organizer creates a new Postponement
- **THEN** they select a championship, league, group, team pair and one of that team's scheduled matches from scraped click-tt data
- **AND** the Postponement is created bound to that match with its team identities snapshotted

### Requirement: Wizard steps

The creation wizard SHALL offer the pick steps in order: groups (championship), leagues, teams, then matches. The final match pick SHALL create the Postponement.

#### Scenario: Full wander

- **WHEN** an organizer follows the wizard from the start
- **THEN** the steps lead them from groups through leagues and teams to a match
- **AND** picking the match creates the Postponement

### Requirement: click-tt Team Identity snapshot

Every created Postponement SHALL persist the three-part click-tt address of each team — `championship`, `group`, `teamtable` (ADR-0022) — so the scraper can re-fetch that team's schedule for clash checks later.

#### Scenario: Team identity stored per team

- **WHEN** a Postponement is created from a scraped match
- **THEN** `homeTeamIdentity` and `guestTeamIdentity` each carry championship, group and teamtable

#### Scenario: Venues are snapshotted and locked

- **WHEN** a Postponement is created
- **THEN** the home club's venues (venueNumber, name, address, postalCode, city) are snapshotted onto it
- **AND** the venue set is locked thereafter: a Proposed Date may reference one by number, but the venue list itself is never edited

### Requirement: Fixture Mode

The scraper SHALL support an offline fixture mode, activated by the configuration `APP_CLICK_TT_FIXTURES_DIR`, in which it reads local HTML files instead of the click-tt.ch network. It SHALL be used by end-to-end tests so they run deterministically without network access.

#### Scenario: Fixtures directory configured

- **WHEN** `APP_CLICK_TT_FIXTURES_DIR` points at a fixtures directory
- **THEN** all scrapes in the wizard read from those local HTML files
- **AND** no network requests to click-tt.ch are made

### Requirement: Scrape failures are retryable and shown inline

A transient failure to fetch or parse click-tt.ch data (an upstream error such as a 503, or an unreachable host) SHALL be shown to the organizer inline on the wizard step with a retry control, not as a generic error page (see Scrape Failure). Non-transient failures (internal errors, missing parameters) SHALL be logged silently.

#### Scenario: Upstream failure on a wizard step

- **WHEN** click-tt reports an error while the wizard fetches a step's options
- **THEN** the step shows the transient-error message inline
- **AND** a retry control lets the organizer re-run the fetch

#### Scenario: Host unreachable

- **WHEN** the click-tt host is unreachable during a wizard fetch
- **THEN** the step shows the transient-error message inline with a retry control

#### Scenario: Internal failure stays silent

- **WHEN** scraping fails for a non-transient reason (internal error, missing parameter)
- **THEN** the failure is only logged, not shown to the organizer

### Requirement: Official match creation replaces the legacy two-path flow

There SHALL be no user-facing "Edit an Existing Postponement" or manually-typed fixture creation flow; match creation exists only through the scrape wizard.

#### Scenario: No legacy entry points

- **WHEN** a user visits the app
- **THEN** they can only create a Postponement through the scrape wizard
- **AND** no legacy typed-creation or edit-existing entry point is offered