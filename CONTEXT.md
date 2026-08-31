# Context

Domain glossary for PostPony — one shared vocabulary for humans and agents. See also the Architecture Decision Records in `docs/adr/`.

## Postponement

The primary entity: one postponed match, from draft to a confirmed new date. Persisted as a `Postponement` (`src/lib/models.ts`); its rules live in the `PostponementRules` module (`src/lib/postponement.ts`). _Avoid_: Reschedule, session, reschedule

- **State** is a plain, serializable `Postponement`, so it fits the session store unchanged — MemorySessionStore for tests, SqliteSessionStore (`@libsql/client`) for development and production (Turso for production).
- **Voting model** — `organizerTeam` (`'home' | 'away'`, the side the organizer manages), `reopenCount` (number of soft reopens, starts `0`), and `confirmedProposedDateId` (the locked date, kept as history when reopened).
- **Contract** — operations are pure methods that take a session and return a new session; handlers write the returned session back to the store.
- **Operations** (first cut owns all of them):
    - `registerParticipant` — join or match a participant on a team.
    - `addPlayer` — add a roster Player from the edit view.
    - `proposeDate` — add a Proposed Date.
    - `castVote` — record or update a Vote, one per participant per date.
    - `tally` / `splitTallies` — aggregate Votes per Proposed Date, optionally per team.
    - `setVotable` — toggle whether either team may vote on a Proposed Date (formerly `setVotableByOpponent`, now symmetric for home and away).
    - `confirmDate` — lock a Proposed Date as final: sets `confirmedProposedDateId` and moves to `Confirmed`; a no-op for dates not `votable`.
    - `reopen` — soft-reopen a Confirmed session back to `Voting`; `reopenCount` + 1, history/votes/flags preserved.
    - `deleteProposedDate` — delete a Proposed Date; cascade-deletes its Votes and clears a dangling `confirmedProposedDateId` if that date was the confirmed-history date. A no-op for an unknown date id; status is left untouched.
- **Seam** — non-determinism sits behind two overridable methods, `newId` and `now` (an id generator and a clock): real defaults in production, overridden by a `FakePostponementRules` subclass in tests. The class is the test surface.

## Match

The scheduled fixture being postponed. A Postponement postpones exactly one Match; its original start is stored as `originalMatchDateTime`, and its two sides as typed `homeTeam` and `guestTeam` fields. Scraped from click-tt.ch at creation and bound permanently: a Match is never editable afterwards — a Postponement cannot be re-pointed at a different fixture (ADR-0017 superseded by the scrape-only decision). click-tt calls it a "meeting", wording that survives only in the outbound click-tt URLs. _Avoid_: Meeting, fixture, game

## Player

A raw player from the roster, scraped from click-tt.ch or added by the owner: `{id, name, teamId}` with `teamId` `'home' | 'away'`. No login; identity is per-postponement, held client-side in `localStorage` (see ADR-0013). _Avoid_: member, user

## Participant

A Player taking part in a Postponement — joined via the invitation link and able to Vote. Every Vote and availability record references a Participant (`participantId`). _Avoid_: player (when meaning "has joined"), attendee

## Proposed Date

A candidate new date/time for the postponed Match, proposed by the owner. Carries a `dateTimeRange` and a `votable` flag — a pure access toggle deciding whether either team may vote on it, flipped by the organizer. New dates are votable by default; non-votable dates are hidden from both teams' polls and cannot be confirmed.

## Clash

A scheduled Match of the home or the guest team whose start falls within a Proposed Date's `dateTimeRange` plus a two-hour buffer on either side — the hall may be booked or the team double-booked. Computed from both teams' scraped click-tt schedules by checking when dates are proposed and again on a manual refresh; the postponed Match itself is excluded — the game being rescheduled is not a Clash. Each Clash is attributed to the affected team (home or away) and carries the opponent's name and the game's start. A newly proposed date that has a Clash is auto-deselected (its `votable` flag set to `false`), a default the organizer can reverse with the votable switch. A match without team identities has no clash data. _Avoid_: conflict, collision, double booking

## Venue

A hall of the home club where a rescheduled Match can be played. Carries a 1-based `venueNumber` and a name/address. The home club's venues are snapshotted on the Postponement at creation and locked thereafter; a Proposed Date may reference one by number. _Avoid_: hall, Spiellokal, location

## Venue Occupancy

The number of the home club's home Matches scheduled at a Venue whose start falls within a Proposed Date's `dateTimeRange` plus a two-hour buffer on either side — the hall may be busy at that time. Computed from the home club's scraped schedule (all teams, home matches only) when clashes are checked and again on a manual refresh; the postponed Match itself is excluded. Informational only: unlike a Clash, it never auto-deselects a Proposed Date. Matches without a venue number are not counted. _Avoid_: venue clash, hall conflict, double booking

## Vote

A Participant's `Yes` / `No` / `Maybe` on one Proposed Date. At most one Vote per Participant per Proposed Date; re-voting updates the existing Vote.

## Proposed Dates Generator

The edit-page interaction for proposing a weekly slate of candidate times in one step. It renders a fixed Monday–Sunday grid; for each day the organizer either enters a time (which produces a Proposed Date inside the planning window, anchored on the Match's `originalMatchDateTime`) or leaves the row empty (which is skipped). The weekdays are locked and cannot be added, removed, or re-labelled. _Avoid_: add-row/remove-row generator, free-form slate

## Status

The lifecycle of a Postponement: `Draft → Voting → Confirmed`. `Draft` at creation, `Voting` from the first proposed-date add and again on reopen, `Confirmed` when the organizer locks a date. Reopen returns to `Voting` and increments `reopenCount`.
