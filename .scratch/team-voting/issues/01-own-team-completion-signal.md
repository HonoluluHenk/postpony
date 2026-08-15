# Own-team completion signal

Status: closed Label: wayfinder:grilling Parent: map.md

## Question

How does the organizer know their team's internal vote is "done enough" to propose dates to the opponent? Voting starts automatically when dates are defined; there is no quorum. Does the edit view need a participation view (e.g. "5 of 8 roster players voted") or a per-date list of who has not voted yet — or does the organizer just read the per-player votes and use judgment?

## Notes

- Decision, HITL: grill with the organizer. Consult `grilling`, `domain-modeling`.
- Locked charting decisions: organizer sees own team per-player; no vote-threshold gate; flag stays a pure access toggle. This ticket fixes how "voting is done" is *signalled*, not how it is *enforced*.
- No voting close act is decided yet — that is this ticket's core question.

## Decision (grilled 2026-08-15)

- No close act. Signalling is purely informational; proposing dates to the opponent is the "done" signal.
- Edit view shows a per-date participation count ("N/M voted") and a per-date list of who has not voted yet.
- Denominator M = all own-team players: scraped roster + any new names (joined or not). Organizer (a roster player) counts in M; organizer never votes from the edit view, so the count reads (M-1)/M until the organizer joins via the own-team link.
- "Voted" = has a Vote on that specific date, any type.
- Non-voter list shows all non-voters and marks never-joined players as "not joined" so list stays consistent with the count.
