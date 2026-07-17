# ADR 0013: Join Participant Identity and Team Role

## Status
Accepted

## Context
Invited participants (players from both teams) join a `RescheduleSession` via a tokenized link to vote on
proposed dates. Two questions had to be answered:

1. **Which team is a participant on?** The home and away teams share one session, but each participant belongs
   to exactly one of them.
2. **How is a participant identified across visits** so their previous votes can be pre-selected and updated,
   without adding authentication?

Per [ADR 0002](0002-security-model-dual-password.md), participants authenticate only via the shared
`invitationPassword` embedded in the link — there is no per-user login, and impersonation prevention is
explicitly out of scope for the MVP.

## Decision

### 1. Team role lives in the URL path
Both teams share the single `invitationPassword` from [ADR 0002](0002-security-model-dual-password.md)
(stored as `invitationPasswordHash`). The team is encoded in the path rather than in a separate password:

* **URL format**: `/join/:id/:team?token=<invitationPassword>`
* `:team` is validated against the literal type `'home' | 'away'` (`Player.teamId`); anything else is a 400.
* Shared route guards live in `src/routes/join/join-utils.ts`:
    * `requireTeam(app)` — validates and returns the `Team` literal.
    * `requireSessionAndToken(app)` — resolves the session and verifies the token against
      `invitationPasswordHash`.
* The edit page renders two links (home / away), each carrying the same token.

### 2. Participant identity via `localStorage`
A participant's identity is stored client-side, not in a cookie or server session:

* **Key**: `postpony-player-<sessionId>` — **Value**: the server-issued `playerId`.
* On return visits the join page reads the stored `playerId` and auto-redirects to the vote step
  (`/join/:id/:team/vote?playerId=X`).
* Identity is deliberately **scoped per postponement**: the same person joining a different session gets an
  independent `playerId`.
* Votes are stored on the session (`votes: Vote[]`) and keyed by `playerId`, allowing changes until the admin
  finalizes the session (read-only once status is `Confirmed`).

## Rationale

* **Simplicity**: Reusing the single invitation token avoids a second password field and extra token entity.
  The team is a routing concern, so the path is the natural place for it.
* **No auth needed**: `localStorage` gives a stable per-device identity without cookies, sessions, or a login
  system — consistent with the "link-only" participant experience and the MVP's explicit exclusion of
  impersonation prevention.
* **Strong typing**: `'home' | 'away'` as a literal type keeps the team "typed, not stringly", validated once
  at the trust boundary.

## Consequences

* **Device-bound identity**: Clearing `localStorage` or switching devices/browsers loses the association;
  the participant would re-identify and could create a duplicate `Player`. Acceptable for the MVP.
* **No impersonation protection**: Anyone with the link can vote as any listed player. This is a known,
  accepted limitation (see [ADR 0002](0002-security-model-dual-password.md)).
* **In-memory persistence**: Votes and players currently live in the in-memory `App.sessions` store; they do
  not survive a restart. This is the current persistence reality and a natural `ponytail:` upgrade point
  toward the storage strategy in [ADR 0007](0007-data-storage-strategy.md).
