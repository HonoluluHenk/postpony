# Status semantics

Status: closed Label: wayfinder:grilling Parent: map.md

## Question

Which `PostponementStatus` is written at which transition? Today only `Draft` (creation)
and `Confirmed` (lock) are wired; the middle states (`Proposed`, `Voting`,
`Confirmed by Opponent`) are declared but unused. The charted flow writes `Voting` on reopen and `Confirmed` on lock — is `Draft` correct while own-team voting is open and until the organizer locks? Does `Proposed` get a meaning (dates proposed to opponent) or stay unused?

## Notes

- Decision, HITL: grill with the organizer. Consult `grilling`, `domain-modeling`.
- Locked charting decisions: voting starts automatically (no explicit start act); reopen sets status → `Voting`; organizer locks alone → `Confirmed`; `Confirmed by Opponent`
  stays unused (organizer locks alone).
- The status drives the vote page's `readOnly` flag (`vote-view.ts:21`) and the edit view's lock — so the mapping is observable, not just cosmetic.

## Decision (grilled 2026-08-15)

- `PostponementStatus` shrinks to `Draft | Voting | Confirmed`; `Proposed` and `Confirmed by Opponent` are removed from the union.
- `Draft` — written at creation (scrape match-pick / create). Means: organizer setup, no proposed dates yet.
- `Voting` — written on first proposed-date add (voting starts automatically); stays `Voting` through the negotiation and on reopen. Reopen does not change status (already `Voting`).
- `Confirmed` — written when the organizer locks alone; the only locked state.
- The vote page `readOnly` / `canVote` gate stays `status === 'Confirmed'` (`vote-view.ts:21`, `join-vote-post.ts:22`) — unchanged.
- "Proposed to opponent" is carried by the per-date `votableByOpponent` flag, not by session status.
- Ripple for the spec: update `models.ts` union, `CONTEXT.md` lifecycle line, and legacy `docs/use_cases.md` references.
