# 05: Confirmation restricted to acceptable dates

**What to build:** the organizer confirms the new date only when it is votable, acceptable, and not vetoed. The edit UI surfaces which dates are acceptable and which are vetoed, and an invalid confirmation attempt is a no-op with feedback.

**Blocked by:** 03 — Organizer-captain edit authorization, 04 — Opponent-captain scoped view

**Status:** ready-for-agent

- [x] The edit UI shows, per Proposed Date, whether it is acceptable and whether it is vetoed.
- [x] The confirm affordance succeeds only for a date that is votable, acceptable, and not vetoed.
- [x] Confirming a date that is not acceptable or is vetoed is a no-op and surfaces feedback to the organizer.
- [x] e2e covers confirming a valid date end-to-end and attempting an invalid confirmation.

## Comments

- `e7add43` feat(edit): restrict confirmation to acceptable, unvetoed dates — surfaces `acceptable`/`vetoed` as date chips, exposes them via `buildEditPartialsData`, and announces a no-op feedback message from `confirm-date-post`; fixes the e2e confirm flows (join-voting, postponement-editing, proposed-date-generator, focus-management) to mark the date acceptable via the opponent-captain surface first and adds an invalid-confirm no-op e2e; stabilises the opponent-captain toggle e2e via a spinner settle.
