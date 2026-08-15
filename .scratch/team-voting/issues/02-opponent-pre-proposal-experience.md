# Opponent pre-proposal experience

Status: open Label: wayfinder:grilling Parent: map.md

## Question

Before the organizer has proposed any date (`votableByOpponent: false` on all dates), what does the opponent see and do on the join/vote page? Can they register a name then (only to see an empty vote list), or should the page tell them "no dates proposed yet"
before they register?

## Notes

- Decision, HITL: grill with the organizer. Consult `grilling`, `domain-modeling`,
  `route-handlers`.
- Current code: `vote-view.ts` filters away-team visibility by `awayTeamVotable`; with no proposed dates the opponent would see an empty list. `join-get.ts` lets anyone register a name at any time.
- Locked charting decision: registration is possible while voting is open; once
  `Confirmed`, invite view is pure info (no registration). The grey zone this ticket resolves is the pre-proposal window.
- Connects to ticket 01 (completion signal) only in that both shape the vote-page UX.
