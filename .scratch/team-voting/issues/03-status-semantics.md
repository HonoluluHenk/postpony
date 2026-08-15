# Status semantics

Status: open Label: wayfinder:grilling Parent: map.md

## Question

Which `PostponementStatus` is written at which transition? Today only `Draft` (creation)
and `Confirmed` (lock) are wired; the middle states (`Proposed`, `Voting`,
`Confirmed by Opponent`) are declared but unused. The charted flow writes `Voting` on reopen and `Confirmed` on lock — is `Draft` correct while own-team voting is open and until the organizer locks? Does `Proposed` get a meaning (dates proposed to opponent) or stay unused?

## Notes

- Decision, HITL: grill with the organizer. Consult `grilling`, `domain-modeling`.
- Locked charting decisions: voting starts automatically (no explicit start act); reopen sets status → `Voting`; organizer locks alone → `Confirmed`; `Confirmed by Opponent`
  stays unused (organizer locks alone).
- The status drives the vote page's `readOnly` flag (`vote-view.ts:21`) and the edit view's lock — so the mapping is observable, not just cosmetic.
