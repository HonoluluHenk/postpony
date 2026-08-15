# Two-phase team voting — wayfinder map

Status: open Label: wayfinder:map

## Destination

A **spec** (`spec.md` in this directory) for two-phase team voting: the organizer picks their team when scraping a match, defines alternate dates, their team votes first, the organizer proposes a subset of dates to the opponent, the opponent votes, the organizer confirms a final date, and a soft reopen lets both teams re-vote. Delivered as a spec for later implementation — planning only, no code in this map.

## Notes

- Domain: Postponement, Player, Participant, Proposed Date, Vote (CONTEXT.md).
- Skills every session should consult: `grilling`, `domain-modeling`, `route-handlers`,
  `localization`, `css-styling`, `testing`.
- Current code: `src/lib/postponement.ts` (rules), `src/lib/models.ts` (shapes),
  `src/routes/edit/`, `src/routes/join/`, `src/routes/create/scrape/`.
- Tracker: local markdown under `.scratch/` (docs/agents/issue-tracker.md). Tickets are files in `issues/`; blocking is textual, `Blocked by:` lines.
- Standing preference: reuse `awayTeamVotable` mechanics where possible (minimal change); keep organizer a manager, not a voter.

### Decisions locked during charting (grilling 2026-08-15)

- Destination deliverable: spec, not implementation.
- Organizer may be either team; picks their team in the scrape match list (two buttons per match — one per side). Opponent roster still scraped.
- Invitation flow reused for both teams (join link, pick roster player or new name).
- "Propose to opponent" = the existing `awayTeamVotable` flag, renamed to
  `votableByOpponent`, generalized for both directions. Flag stays a pure access toggle:
  organizer's judgment, no vote-threshold gate.
- Own-team voters: roster players + new names, via the invitation flow.
- Organizer views own team's votes per-player (names); opponent's votes as tallies only. Team members see their team's votes (names) + own-team tallies.
- Voting starts automatically when dates are defined; no explicit "start vote" act.
- Confirmed invite view: pure info — chosen date shown, no registration, no voting.
- Organizer locks the final date alone (`Confirmed` directly); `Confirmed by Opponent`
  stays unused.
- Only dates already proposed to the opponent can be confirmed.
- Confirmed is not terminal: organizer can reopen. Reopen: status → `Voting`, opponent votes kept, organizer may propose new dates, both teams re-vote on all proposed dates.
  `reopenCount` increments and is shown on the invite + edit views. Previous
  `confirmedProposedDateId` kept as history.
- Reopen-triggered new dates start `votableByOpponent: false`; explicit flip.
- Organizer never casts a ballot; edit view shows a note that the organizer can use the own-team link to participate as a team member.
- Storage: top-level `organizerTeam`, `confirmedProposedDateId` on Postponement; flag renamed `awayTeamVotable` → `votableByOpponent` with migration (fixtures + SQLite).

## Decisions so far

<!-- one line per closed ticket: title + link + gist -->

## Not yet specified

- **Opponent's pre-proposal experience** — what the opponent sees on the vote page before any date is proposed, and whether they can register at that point. Fog: sharpens into ticket 02.
- **Own-team completion signal** — how the organizer decides own-team voting is "done"
  (participation view? close-vote act?). Fog: sharpens into ticket 01.
- **Status semantics** — which statuses are written at which transition (Draft, Voting on reopen, Confirmed on lock). Fog: sharpens into ticket 03.
- Later UI detail for the spec (fog, not yet sharp): exact wording/locale keys for
  "reopened N times", the confirmed-info view, and the per-team results section.

## Out of scope

- Opponent roster management in-app (roster is scraped; opponent joins by name/roster pick).
- A separate "opponent accepts" step — organizer locks alone.
- Explicit vote quorum/thresholds enforced by the app (organizer judgment).
- Multi-round negotiation beyond the soft reopen (no back-and-forth ladder).

## Tickets

Child tickets live in `issues/`. Frontier = open + unblocked: 01, 02, 03.
