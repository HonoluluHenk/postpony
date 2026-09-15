# 05: Confirmation restricted to acceptable dates

**What to build:** the organizer confirms the new date only when it is votable, acceptable, and not vetoed. The edit UI surfaces which dates are acceptable and which are vetoed, and an invalid confirmation attempt is a no-op with feedback.

**Blocked by:** 03 — Organizer-captain edit authorization, 04 — Opponent-captain scoped view

**Status:** ready-for-agent

- [x] The edit UI shows, per Proposed Date, whether it is acceptable and whether it is vetoed.
- [x] The confirm affordance succeeds only for a date that is votable, acceptable, and not vetoed.
- [x] Confirming a date that is not acceptable or is vetoed is a no-op and surfaces feedback to the organizer.
- [x] e2e covers confirming a valid date end-to-end and attempting an invalid confirmation.
