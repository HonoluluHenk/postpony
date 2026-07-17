# Context

Domain glossary for PostPony — one shared vocabulary for humans and agents. See also the Architecture Decision Records in `docs/adr/`.

## Reschedule

The primary entity: one postponement of a match, from draft to a confirmed new date.

- **Deep module** (`src/lib/reschedule.ts`, the `Reschedule` class) — owns the rules that used to leak across the edit handlers (`src/routes/edit/id/*-post.ts`) and the join handlers (`src/routes/join/*-post.ts`, `vote-view.ts`); handlers now call `new Reschedule().<op>(...)`.
- **State** is a plain, serializable `RescheduleSession` (`src/lib/models.ts`), so it fits the session store unchanged — in-memory today, Firestore per ADR-0007.
- **Contract** — operations are pure methods that take a session and return a new session; handlers write the returned session back to the store.
- **Operations** (first cut owns all of them):
    - `registerParticipant` — join or match a player on a team.
    - `addPlayer` — add a home-team player from the edit view.
    - `proposeDate` — add a Proposed Date.
    - `castVote` — record or update a Vote, one per participant per date.
    - `tally` — aggregate Votes per Proposed Date.
    - `setVenueLimit` — set `maxOverlaps`.
- **Seam** — non-determinism sits behind two overridable methods, `newId` and `now` (an id generator and a clock): real defaults in production, overridden by a `FakeReschedule` subclass in tests. The class is the test surface.

## Participant

A player on the `home` or `away` team. Identity is per-postponement, held client-side in
`localStorage` (see ADR-0013), never a login.

## Vote

A Participant's `Yes` / `No` / `Maybe` on one Proposed Date. At most one Vote per Participant per Proposed Date; re-voting updates the existing Vote.
