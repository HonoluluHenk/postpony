# Opponent pre-proposal experience

Status: closed Label: wayfinder:grilling Parent: map.md

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

## Decision (grilled 2026-08-15)

- Opponent registers a name pre-proposal — allowed, plain register form, no banner.
- After registering, vote page shows empty state + hint that the organizer is still deciding which dates to propose (reword `vote_no_dates`; exact wording = later UI fog).
- Decision is opponent-only; own team always sees dates, unchanged.
- Registration guard meaning (for ticket 03): blocked only when `Confirmed` — pre-proposal (`Draft`) counts as open, no new status gate.
- Unregistered opponent hitting `/vote` keeps redirecting to the join form; registered opponent sees the empty vote page. Tally section stays hidden pre-proposal.
