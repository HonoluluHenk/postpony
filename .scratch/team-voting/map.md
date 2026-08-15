# Two-phase team voting — wayfinder map

Status: closed Label: wayfinder:map

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
- Organizer locks the final date alone (`Confirmed` directly); `Confirmed by Opponent` removed from the status union (ticket 03).
- Only dates already proposed to the opponent can be confirmed.
- Confirmed is not terminal: organizer can reopen. Reopen: status → `Voting`, opponent votes kept, organizer may propose new dates, both teams re-vote on all proposed dates.
  `reopenCount` increments and is shown on the invite + edit views. Previous
  `confirmedProposedDateId` kept as history.
- Reopen-triggered new dates start `votableByOpponent: false`; explicit flip.
- Organizer never casts a ballot; edit view shows a note that the organizer can use the own-team link to participate as a team member.
- Storage: top-level `organizerTeam`, `confirmedProposedDateId` on Postponement; flag renamed `awayTeamVotable` → `votableByOpponent` with migration (fixtures + SQLite).

## Decisions so far

<!-- one line per closed ticket: title + link + gist -->

- Own-team completion signal — no close act; per-date "N/M voted" count + non-voter list (never-joined marked "not joined"); M = roster + new names, organizer counted. ([ticket 01](issues/01-own-team-completion-signal.md))
- Opponent pre-proposal experience — opponent registers pre-proposal (plain form); vote page shows empty state + hint organizer is still deciding dates; opponent-only, own team unchanged; registration blocked only when `Confirmed`. ([ticket 02](issues/02-opponent-pre-proposal-experience.md))
- Status semantics — statuses shrink to `Draft | Voting | Confirmed`; `Draft` on creation, `Voting` on first date + reopen, `Confirmed` on lock; `Proposed` and `Confirmed by Opponent` removed. ([ticket 03](issues/03-status-semantics.md))
- Write the two-phase team-voting spec — destination reached; implementation spec written to `spec.md` in this directory (model + migration, status lifecycle, domain ops, scrape team-pick, registration/confirmed view, edit + vote pages, locale keys, docs ripple, testing). ([ticket 04](issues/04-write-the-spec.md))

## Not yet specified

The open wording items below are carried into `spec.md`'s Fog section (exact locale strings only; no behavioral decisions pending).

- Later UI detail for the spec (fog, not yet sharp): exact wording/locale keys for
  "reopened N times", the confirmed-info view, and the per-team results section.

## Out of scope

- Opponent roster management in-app (roster is scraped; opponent joins by name/roster pick).
- A separate "opponent accepts" step — organizer locks alone.
- Explicit vote quorum/thresholds enforced by the app (organizer judgment).
- Multi-round negotiation beyond the soft reopen (no back-and-forth ladder).

## Tickets

Child tickets live in `issues/`. Frontier: none — all tickets closed, destination delivered (spec.md).
