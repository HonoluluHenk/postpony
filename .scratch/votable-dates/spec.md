# Spec: Votable Dates Gate Both Teams

Status: ready-for-agent

## Problem Statement

The per-date voting toggle only gates the opponent team. If the owner posts a Postponement as the home side, their own team votes on every Proposed Date while the away team votes only on dates explicitly opened — the toggle promises opponent-scoped gating the product no longer wants. Worse, the hardcoded `team === 'away'` condition silently inverts the whole scheme when the owner is the away side: the opponent (home) votes freely while the owner's own team is blocked. Dates should be either open to everyone or closed to everyone.

## Solution

Each Proposed Date's flag becomes a plain `votable` flag that gates both teams symmetrically. Newly proposed dates are votable immediately. A closed (non-votable) date is hidden from every participant's poll and accepts no votes; confirming a date still requires it to be votable. Old stored Postponements keep loading and behaving unchanged via a read-time fallback.

## User Stories

1. As an owner, I want every newly proposed date to be votable by both teams immediately, so that my team and the opponent can vote without me flipping a switch first.
2. As an owner, I want the per-date toggle labeled "votable" instead of opponent-scoped, so that the label matches the behavior for both teams.
3. As an owner, I want to close any date to voting for both teams, so that a date still under discussion does not collect premature votes.
4. As a participant on either team, I want closed dates hidden from my voting poll, so that I only make up my mind on dates that count.
5. As a participant, I want to be unable to cast a Vote on a closed date even by submitting a crafted request, so that the gate cannot be bypassed.
6. As a participant on either team, I want to vote on every votable date, so that the two sides get equal input regardless of which team owns the Postponement.
7. As an owner, I want Confirming a date to remain limited to votable dates, so that I cannot lock a date nobody could vote on.
8. As a user of a Postponement stored before this change, I want it to load and behave unchanged, so that old sessions stay usable.
9. As an owner who is the away side, I want the gate to work identically to the home-side case, so that the previous silent inversion (own team blocked, opponent free) is gone.
10. As an owner, I want the toggle's accessible name and all locale strings updated, with fr-CH/it-CH reusing the English UI as before.
11. As a participant opening the poll when every date is closed, I want the existing empty-state hint, so that I understand there is nothing to vote on.
12. As a developer, I want one source of truth for "which dates are votable", so that the poll display and the server-side guard cannot drift apart.

## Implementation Decisions

- **Model.** `ProposedDate.votableByOpponent: boolean` becomes `votable: boolean`. The meaning changes from "opponent may vote" to "either team may vote".
- **Domain operation.** `setVotableByOpponent(session, proposedDateId, votable)` becomes `setVotable`. Behavior unchanged apart from the field it writes.
- **Default openness.** `proposeDate` creates new dates with `votable: true`, so the owner's existing flow (propose → vote → confirm) works with no toggle dance and the opponent can participate from the start. The toggle becomes an opt-out ("close this date to voting").
- **Single voting rule.** A pure `votableDates(session)` method on the domain module returns the voting-open Proposed Dates. With the team dimension gone, this one rule replaces both the poll filter and the guard condition.
- **Vote poll.** The team-scoped filtering (`team === 'away' ? votable : all`) is replaced by `votableDates` for every participant; the team parameter drops out of the filter.
- **Vote guard.** The join vote handler accepts posted Votes only for dates in `votableDates`, dropping the hardcoded `team === 'away'` check. This removes the owner-is-away inversion bug.
- **Confirm gate.** `confirmDate` keeps its no-op semantics for non-votable dates; the edit page keeps hiding the confirm button on such dates.
- **Stored-session compatibility.** `normalize()` reads the flag with `votable` as the primary key, falling back to `votableByOpponent` and then the legacy `awayTeamVotable`. Pure read-time normalization, nothing rewritten — mirroring the existing fallback pattern, so no DB migration.
- **Wording.** i18n key `votable_by_opponent` ("Allow opponent to vote" / "Gegner abstimmen lassen") is replaced by `votable_toggle` ("Allow voting" / "Abstimmung zulassen"), used as the toggle's title and aria-label. The `votable_short` column header ("Votable" / "Abstimmbar") already matches the new meaning and stays. en.json and de.json stay in sync; fr-CH/it-CH reuse the English strings via the existing mechanism.
- **HTTP surface.** The `/proposed-date-visibility` route and its query parameters are unchanged — they are internal and invisible to users.

## Testing Decisions

- A good test asserts the contract from outside: a fresh date is open to both teams, a closed date appears in no poll and holds no Votes, and legacy sessions load unchanged. Tests do not assert internal plumbing.
- **Domain spec — `postponement.spec.ts` (prior art: pure domain module specs):** `proposeDate` defaults `votable: true`; `setVotable` toggles the flag; `confirmDate` is still a no-op for non-votable dates; `votableDates` returns exactly the open dates, order preserved.
- **Vote view spec — `vote-view.spec.tsx`:** a non-votable date is absent from the poll for a home participant and a away participant alike; a votable date is present for both; the empty-state hint appears for either team when no dates are open.
- **Join handler spec — `join-handlers.spec.ts`:** Votes posted for a closed date are ignored for both teams; Votes for open dates land.
- **Edit handler spec — `edit-handlers.spec.ts`:** the toggle route flips `votable` on the stored session in both directions.
- **Store spec — `session-store.spec.ts`:** `normalize()` surfaces `votable`, falls back to a row with the old `votableByOpponent` key, and then to the legacy `awayTeamVotable` key.
- **Fixture builders — `builders.spec.ts`:** the `aProposedDate` default becomes `votable: true`.
- **E2E — existing suites updated:** `join-voting.e2e.ts` symmetric poll plus the closed-date-hidden case; `postponement-editing.e2e.ts` toggle and the reopen flow (asserts dates added after a reopen are votable, flipping the old expectation); `responsive.e2e.ts` toggle reachability; `clash-checks.e2e.ts` organizer steps. a11y checks (`checkA11y`) keep passing with the new aria-label.
- Prior art: `postponement.spec.ts`, `vote-view.spec.tsx`, `join-handlers.spec.ts`, `edit-handlers.spec.ts`, `session-store.spec.ts`, the e2e suites above.

## Out of Scope

- Renaming the `/proposed-date-visibility` route or its query parameters.
- Per-team voting overrides (e.g. "home may vote, away may not").
- Removing the confirm gate on non-votable dates.
- Rendering closed dates greyed-out/disabled in the poll (they are hidden).
- A DB migration; compatibility is handled purely at read time.

## Further Notes

- The reopen flow: any date added after reopening is votable by default, exactly like a date added the first time.
- The old `team === 'away'` condition was a latent bug when the owner played the away side; the symmetric gate removes the notion of an "opponent" from voting entirely, which also simplifies the domain language.