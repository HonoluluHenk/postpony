# 07 — Docs ripple: CONTEXT.md and use_cases.md

**What to build:** the domain documentation matches the implemented two-phase voting model. `CONTEXT.md` — Status section lifecycle becomes `Draft → Voting → Confirmed`; Proposed Date section renames `awayTeamVotable` to `votableByOpponent`; Postponement section gains `organizerTeam`, `reopenCount`, `confirmedProposedDateId`; operations list gains `confirmDate`, `reopen`, and the renamed `setVotableByOpponent`. `docs/use_cases.md` — remove the `"Proposed"` state reference and rewrite the approval & finalization section to organizer-locks-alone plus soft reopen (the two-step opponent-confirmation wording is obsolete).

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] `CONTEXT.md` lifecycle and model sections reflect the new status union, fields, and operations.
- [ ] `docs/use_cases.md` no longer references `"Proposed"` and describes lock-alone plus soft reopen.
- [ ] No stale references to `awayTeamVotable`, `Proposed`, or `Confirmed by Opponent` remain in either doc.