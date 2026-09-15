# 02: Domain rules adopt Opponent Votable & Accepted

**What to build:** the rules module speaks the new vocabulary. `setOpponentVotable` (a no-op on a date the organizer has made non-votable) and `setAccepted` replace the old setters; the team poll keep-filter drops a date from the opponent team's poll while `opponentVotable` is off, and the confirmation gate requires the date to be votable, `opponentVotable`, and `accepted`. Still no user-visible change, because the legacy fields remain in sync until the contract ticket.

**Blocked by:** 01 — Expand Proposed Date with Opponent Votable & Accepted

**Status:** ready-for-agent

- [ ] The opponent votable setter is a no-op on a date whose symmetric `votable` is off.
- [ ] The opponent-scoped poll hides a date whose `opponentVotable` is off, while the organizer's own poll is unaffected.
- [ ] Confirmation succeeds only for a date that is `votable`, `opponentVotable`, and `accepted`, and is a no-op otherwise.
- [ ] The legacy setters are removed and every caller uses the new operations.
- [ ] Domain specs assert the inverted polarity, the poll scoping, and the confirmation invariant.
