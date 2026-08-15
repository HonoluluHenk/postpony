# Two-phase team voting — implementation spec

Synthesizes the locked decisions of [map.md](map.md) and tickets [01](issues/01-own-team-completion-signal.md), [02](issues/02-opponent-pre-proposal-experience.md), [03](issues/03-status-semantics.md). Ready for handoff to implementation. Every decision below traces to one of those sources; this spec introduces no new decisions. Open wording items are flagged in [Fog](#fog-open-wording) and are the only intentionally unresolved points.

## 1. Flow overview

1. Organizer picks a match in the scrape wizard and picks which side is theirs (two buttons per match).
2. Session created as `Draft` with `organizerTeam` set; both rosters scraped (organizer side + opponent side).
3. Organizer adds proposed dates from the edit view. First add moves status `Draft → Voting`; voting starts automatically.
4. Own team votes via the own-team invitation link. Organizer watches per-player votes and a per-date "N/M voted" count in the edit view.
5. Organizer flips `votableByOpponent` on one or more dates to propose them to the opponent; opponent registers and votes via the opponent link.
6. Organizer confirms a final date alone (`Confirmed`). Only a `votableByOpponent` date can be confirmed.
7. Confirmed view: pure info — chosen date shown, no registration, no voting.
8. Organizer may reopen (`Voting` again): opponent votes kept, new dates start `votableByOpponent: false`, both teams re-vote, `reopenCount` increments.

## 2. Model changes (`src/lib/models.ts`)

```ts
export type PostponementStatus = 'Draft' | 'Voting' | 'Confirmed';
```

`Postponement` adds:

- `organizerTeam: 'home' | 'away'` — which side the organizer manages.
- `reopenCount: number` — number of soft reopens, starts `0`.
- `confirmedProposedDateId?: string` — id of the locked date; kept as history when reopened.

`ProposedDate` renames `awayTeamVotable` → `votableByOpponent: boolean`.

`PostponementStatus` drops `'Proposed'` and `'Confirmed by Opponent'` (ticket 03). All code that references the removed statuses or the old flag must be updated in lockstep: `src/routes/edit/id/edit-id-get.ts`, `proposed-dates-post.ts`, `proposed-date-visibility-post.ts`, `proposed-dates-section.eta`, `edit.eta`, `src/routes/join/vote-view.ts`, `join-vote-post.ts`, `src/lib/postponement.ts`, `src/lib/__test-utils__/builders.ts`, `builders.spec.ts`, `postponement.spec.ts`, e2e `EditPage` toggle.

## 3. Migration

Sessions are JSON blobs in SQLite `sessions.data`. Old rows predate the new fields. Migration is read-time normalization — a pure function applied to every session returned by `SqliteSessionStore.get()` (and mirrored in the memory store for dev/tests). No data rewrite; old rows are upgraded on read:

- `proposedDates[].awayTeamVotable` → `votableByOpponent` (rename, value kept).
- `organizerTeam` absent → `'home'` (pre-existing sessions were created from the club-team side).
- `reopenCount` absent → `0`.
- `confirmedProposedDateId` absent → leave undefined.
- `status` in `{'Proposed', 'Confirmed by Opponent'}` → `'Voting'`; `Draft`/`Voting`/`Confirmed` kept.

Test fixture builders (`aSession`, `aProposedDate`) and any session-shaped test data move to the new shape at the same time, so the migration path is exercised by the unit test for `normalize`.

## 4. Status lifecycle (ticket 03)

- `Draft` — written at creation (scrape match-pick / manual create). Means organizer setup, no proposed dates yet.
- `Voting` — written on first proposed-date add; stays `Voting` through negotiation and on reopen (reopen does not change status — it already is `Voting`).
- `Confirmed` — written when the organizer locks alone; the only locked state.
- Vote page `readOnly` / `canVote` gate stays `status === 'Confirmed'` (`vote-view.ts:21`, `join-vote-post.ts:22`).
- "Proposed to opponent" is carried by the per-date `votableByOpponent` flag, not by session status.

## 5. Domain operations (`src/lib/postponement.ts`)

Changed:

- `proposeDate` — on add, if `session.status === 'Draft'` set it to `'Voting'`. New dates always start `votableByOpponent: false` (unchanged behavior, now explicitly the contract for reopen-triggered dates).
- `setAwayTeamVotable` renamed → `setVotableByOpponent(session, proposedDateId, votable)`. Behavior unchanged: a pure access toggle, organizer's judgment, no vote-threshold gate.

New:

- `confirmDate(session, proposedDateId)` — sets `confirmedProposedDateId`, status → `'Confirmed'`. Must reject (no-op/error) any date that is not `votableByOpponent`. Only dates already proposed to the opponent can be confirmed.
- `reopen(session)` — status → `'Voting'`, `reopenCount + 1`, keeps `confirmedProposedDateId` as history, keeps all `votes`, keeps all `proposedDates` with their `votableByOpponent` flags.
- Own-team completion helpers (ticket 01): per-date voted count and non-voter list for a team. "Voted" = has a Vote on that date, any type. Denominator M = all organizer-team players (roster + any new names, joined or not). Players without a Vote are listed; never-joined players (no Vote, not registered) are marked "not joined".

`castVote`, `tally`, `splitTallies`, `registerParticipant`, `addPlayer` unchanged.

## 6. Scrape team-pick

`matches.eta` renders two buttons per match row instead of one "create session" button — one per side, labelled with the side's team name ("Create as <home team>", "Create as <guest team>"). Each button posts to the existing `/create/scrape/match` with the same hidden fields; the chosen side is carried in `teamName` (already a form field). `match-post.ts` derives `selectedTeamId = m.teamName === m.homeTeam ? 'home' : 'away'` (existing logic) and sets `organizerTeam: selectedTeamId`. Organizer-side roster and opponent roster are scraped exactly as today. Session name, passwords, and metadata unchanged.

## 7. Invitation, registration, and the confirmed view

Both teams use the existing invitation flow (per-team join link, pick roster player or new name) — unchanged. `organizerTeam` does not change which links are issued; the edit view keeps both links.

- Pre-proposal (`Draft`): opponent registration is allowed — plain register form, no banner (ticket 02). After registering, the vote page shows an empty state plus a hint that the organizer is still deciding which dates to propose (rewrite of `vote_no_dates`; wording in [Fog](#fog-open-wording)). The tally/results section stays hidden pre-proposal.
- Registration guard: `join-register-post.ts` blocks registration only when `status === 'Confirmed'` (ticket 02, ticket 03) — `Draft` counts as open. A blocked register redirects to the confirmed view, not an error page.
- Unregistered visitor on `/vote` keeps redirecting to the join form (unchanged).
- Confirmed (`status === 'Confirmed'`): the join route and the vote route both render the **confirmed-info view** — pure info, chosen date shown, no registration, no voting (map). This replaces the read-only ballot as the team-facing surface; the `readOnly`/`canVote` gate remains as a server-side backstop. Per AGENTS, any element rendered by an HTMX partial here must also exist in the initial template.

## 8. Edit view (`edit.eta`)

- **Own team (organizerTeam) section** — per-player votes by name, one row per player per proposed date (vote type or "no vote"), plus the ticket-01 per-date "N/M voted" count and non-voter list ("not joined" for never-joined players). Organizer is a roster player and counts in M but never casts a ballot from this view.
- **Opponent section** — tallies only, as today (map: opponent's votes as tallies only).
- **Propose-to-opponent toggle** — the per-date "allow opponent to vote" switch, relabelled for the general flag (`votableByOpponent`). Pure access toggle; no threshold.
- **Confirm action** — per proposed date that is `votableByOpponent`, a "Confirm" control. Sets `confirmedProposedDateId` + `Confirmed`.
- **Reopen action** — shown when `Confirmed`. Reopens to `Voting` (see §5). New dates added after reopen start `votableByOpponent: false` and need an explicit flip.
- **Reopen count** — "reopened N times" shown on the edit view and the invite view (§7). Wording in [Fog](#fog-open-wording).
- **Organizer note** — the edit view states that the organizer can use the own-team link to participate as a team member and vote (map: organizer never casts a ballot from the edit view).
- Status chip renders the new union (`Draft | Voting | Confirmed`).

## 9. Vote page results section (`vote.eta`, `vote-tally.eta`)

The vote page gains a results section for the voter's team: per-player votes by name per date (own team only) plus the existing own-team tally. Opponent members see opponent votes; organizer-team members see organizer-team votes. Neither team sees the other team's per-player names. The organizer sees the opponent only as tallies in the edit view (§8).

## 10. Locale keys

New/renamed keys (names listed; wording for the [Fog](#fog-open-wording) items is deferred):

- `scrape_create_as_home` / `scrape_create_as_away` — the two match buttons (§6).
- rename `away_team_votable` → propose-to-opponent toggle label (§8).
- `confirm_date` / `reopen` — confirm and reopen actions (§8).
- `own_team_votes` / `your_team_votes` — results-section headings (§8, §9).
- `voted_count` — "N/M voted" (§8).
- `not_joined` — never-joined marker (§8).
- `organizer_join_note` — the organizer-as-member note (§8).
- rewrite `vote_no_dates` — opponent pre-proposal hint (§7).

## 11. Docs ripple (ticket 03)

- `CONTEXT.md` — Status section lifecycle becomes `Draft → Voting → Confirmed`; Proposed Date section renames `awayTeamVotable` → `votableByOpponent`; Postponement section gains `organizerTeam`, `reopenCount`, `confirmedProposedDateId`; operations list gains `confirmDate`, `reopen`, and the renamed `setVotableByOpponent`.
- `docs/use_cases.md` — remove the `"Proposed"` state reference (line ~64) and rewrite section 7 ("Approval & Finalization") to organizer-locks-alone plus soft reopen; the two-step opponent-confirmation wording is obsolete.

## 12. Testing

AGENTS.md baseline applies: coverage ≥ 80%, e2e for happy path and likely error paths.

Unit (`src/lib/postponement.spec.ts`, handlers spec files):

- `confirmDate`: happy path, rejects non-`votableByOpponent` date, idempotence.
- `reopen`: status, `reopenCount` increment, history kept, votes/date flags kept.
- `proposeDate`: `Draft → Voting` on first add; stays `Voting` on later adds.
- migration `normalize`: legacy row upgrade (rename, defaults, status remap).
- completion helpers: count denominator, never-joined marking.
- `builders.spec.ts` updated for the new shape (AGENTS: builder drift gate).
- handler specs: registration blocked when `Confirmed`, opponent empty state pre-proposal, confirm/reopen endpoints, vote visibility.

E2E (Playwright):

- scrape wizard: two buttons per match, chosen side becomes `organizerTeam`.
- happy path: propose → own-team votes (per-player + "N/M voted") → propose to opponent → opponent votes → confirm → confirmed-info view.
- reopen: confirm → reopen → re-vote → re-confirm; `reopenCount` visible; new post-reopen date not opponent-votable until flipped.
- error paths: confirm of a non-proposed date not possible; registration blocked after confirm; opponent pre-proposal empty state.

## Fog (open wording)

Map's "Not yet specified" items stay open here — exact strings only, no behavioral decisions:

- "reopened N times" wording.
- confirmed-info view wording.
- per-team results section headings.
- rewritten `vote_no_dates` wording.

Implementation may settle these with the localization skill; nothing about the behavior changes.

## Out of scope

As [map.md](map.md): opponent roster management in-app, a separate opponent-accept step, enforced quorums/thresholds, multi-round negotiation beyond the soft reopen.