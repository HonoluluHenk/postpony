# 01: Four-secret model & domain rules

**What to build:** the underlying data model and pure rules for the two-captain flow, with no user-visible change yet. A `Postponement` grows to carry four secrets and a `Proposed Date` grows two flags (`vetoed`, `acceptable`) beside `votable`, while the pure `PostponementRules` operations gain the new capabilities. This is the expand step: the legacy fields stay live so the existing suite stays green.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] A Postponement can carry four secrets — organizer-captain, opponent-captain, home-player, away-player — each stored hashed, with the three shareable plaintexts also persisted.
- [ ] A Proposed Date can carry `vetoed` and `acceptable` alongside `votable`.
- [ ] `removePlayer` removes a roster player and cascade-deletes their votes.
- [ ] `setVetoed` toggles the veto flag only on votable dates and is a no-op otherwise.
- [ ] `setAcceptable` toggles the acceptable flag.
- [ ] `confirmDate` succeeds only for a date that is votable, acceptable, and not vetoed; otherwise it is a no-op returning the unchanged session.
- [ ] The opponent-scoped poll hides vetoed dates from the opponent team only; the organizer's view and symmetric `votable` semantics are unchanged.
- [ ] `reopen` preserves `vetoed` and `acceptable` flags, as it already preserves votes and `votable`.
- [ ] Domain specs at the `PostponementRules` seam cover each new operation; the existing suite stays green with legacy fields intact.
