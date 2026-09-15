# 01: Four-secret model & domain rules

**What to build:** the underlying data model and pure rules for the two-captain flow, with no user-visible change yet. A `Postponement` grows to carry four secrets and a `Proposed Date` grows two flags (`vetoed`, `acceptable`) beside `votable`, while the pure `PostponementRules` operations gain the new capabilities. This is the expand step: the legacy fields stay live so the existing suite stays green.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] A Postponement can carry four secrets — organizer-captain, opponent-captain, home-player, away-player — each stored hashed, with the three shareable plaintexts also persisted.
- [x] A Proposed Date can carry `vetoed` and `acceptable` alongside `votable`.
- [x] `removePlayer` removes a roster player and cascade-deletes their votes.
- [x] `setVetoed` toggles the veto flag only on votable dates and is a no-op otherwise.
- [x] `setAcceptable` toggles the acceptable flag.
- [x] `confirmDate` succeeds only for a date that is votable, acceptable, and not vetoed; otherwise it is a no-op returning the unchanged session.
- [x] The opponent-scoped poll hides vetoed dates from the opponent team only; the organizer's view and symmetric `votable` semantics are unchanged.
- [x] `reopen` preserves `vetoed` and `acceptable` flags, as it already preserves votes and `votable`.
- [x] Domain specs at the `PostponementRules` seam cover each new operation; the existing suite stays green with legacy fields intact.

## Comments

- `fd5d9cc` — `feat(domain): four-secret model and two-captain rules`: adds the four-secret model and `vetoed`/`acceptable` flags, the `removePlayer`/`setVetoed`/`setAcceptable`/`pollDates` ops, the tightened `confirmDate` invariant, read-time normalization defaults, fixture defaults, and the match-post call-site mapping. Existing confirm-date handler tests updated to mark dates `acceptable` so the suite stays green.

