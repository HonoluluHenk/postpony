# Context

Domain glossary for PostPony — one shared vocabulary for humans and agents. See also the Architecture Decision Records in `docs/adr/`.

## Postponement

The primary entity: one postponed match, from draft to a confirmed new date. Persisted as a `RescheduleSession` (`src/lib/models.ts`); its rules live in the `Reschedule` module (`src/lib/reschedule.ts`). _Avoid_: Reschedule, session, reschedule

- **State** is a plain, serializable `RescheduleSession`, so it fits the session store unchanged — MemorySessionStore for tests, SqliteSessionStore (`@libsql/client`) for development and production (Turso for production).
- **Contract** — operations are pure methods that take a session and return a new session; handlers write the returned session back to the store.
- **Operations** (first cut owns all of them):
    - `registerParticipant` — join or match a participant on a team.
    - `addPlayer` — add a roster Player from the edit view.
    - `proposeDate` — add a Proposed Date.
    - `castVote` — record or update a Vote, one per participant per date.
    - `tally` / `splitTallies` — aggregate Votes per Proposed Date, optionally per team.
    - `setAwayTeamVotable` — expose a Proposed Date to the away team.
- **Seam** — non-determinism sits behind two overridable methods, `newId` and `now` (an id generator and a clock): real defaults in production, overridden by a `FakeReschedule` subclass in tests. The class is the test surface.

## Match

The scheduled fixture being postponed. A Postponement postpones exactly one Match; its original start is stored as `originalMatchDateTime`. Scraped from click-tt.ch, which calls it a "meeting" — that wording survives only in the outbound click-tt URLs. _Avoid_: Meeting, fixture, game

## Player

A raw player from the roster, scraped from click-tt.ch or added by the owner: `{id, name, teamId}` with `teamId` `'home' | 'away'`. No login; identity is per-postponement, held client-side in `localStorage` (see ADR-0013). _Avoid_: member, user

## Participant

A Player taking part in a Postponement — joined via the invitation link and able to Vote. Every Vote and availability record references a Participant (`participantId`). _Avoid_: player (when meaning "has joined"), attendee

## Proposed Date

A candidate new date/time for the postponed Match, proposed by the owner. Carries a `dateTimeRange` and an `awayTeamVotable` flag deciding whether the away team may vote on it.

## Vote

A Participant's `Yes` / `No` / `Maybe` on one Proposed Date. At most one Vote per Participant per Proposed Date; re-voting updates the existing Vote.

## Status

The lifecycle of a Postponement: `Draft → Proposed → Voting → Confirmed by Opponent → Confirmed`. Today only `Draft` (creation) and `Confirmed` (read-only lock on voting) are wired in code; the middle states are declared but unused.
