# Opponent Votable & Accepted rework

Status: ready-for-agent

## Problem Statement

The opponent captain's two date controls are named and framed in ways that nobody else in the product uses. The negative switch is called **Veto** — a noun with legal overtones that says nothing about what it actually does (it takes a date out of the opponent team's poll). The positive switch is called **Acceptable** — an adjective that reads like a lukewarm "yes" vote rather than the consent the organizer needs before locking a date. Meanwhile the organizer's own page already talks about a date being **`votable`**, and the opponent's switch is the exact same idea scoped to one team. On top of the wording, the German labels disagree with their own tooltips (label "Veto", tooltip "Diesen Termin ablehnen", chip "Abgelehnt"), and every date row reuses one identical accessible name for its toggle, so a screenreader hears "Veto this date" N times with no way to tell the rows apart.

## Solution

Flip the opponent's negative switch into a positive, team-scoped **Votable** switch — same word as the organizer's, a different flag, on by default — and rename **Acceptable** to **Accepted**. `Vetoed` disappears as a domain concept and as a chip on the organizer's edit view. `Accepted` keeps its meaning: it is the consent that lets the organizer confirm, and it still gates confirmation together with the organizer's symmetric `votable` and the opponent's `Votable`. Every toggle's accessible name gains its date so the rows are distinguishable. Existing sessions keep their behaviour through a read-time migration.

## User Stories

1. As an organizer, I want the opponent's date flags expressed as "Votable" and "Accepted", so that the vocabulary matches how my own page already talks about dates.
2. As an organizer, I want to see which dates the opponent has Accepted, so that I know which dates I may confirm.
3. As an organizer, I want confirming a date to succeed only when it is votable, still in the opponent's poll, and Accepted, so that I cannot lock in a date the opponent has taken out.
4. As an organizer, I want an invalid confirmation to be a no-op with a clear message, so that the invariant holds and I understand why nothing happened.
5. As an organizer, I want my existing postponements to keep working after the change, so that previously rejected dates stay out of the opponent's poll and previously accepted dates stay confirmable.
6. As an organizer, I want my symmetric `votable` switch to keep its exact meaning, so that nothing about my own controls changes.
7. As an organizer, I want the edit view to stop showing a "Vetoed" chip, so that the UI never references a concept that no longer exists by that name.
8. As an organizer, I want the edit view to show an "Accepted" chip, so that the opponent's consent reads consistently with the new vocabulary.

9. As an opponent captain, I want a "Votable" switch per date, on by default, so that I can take a date out of my own team's poll.
10. As an opponent captain, I want the tooltip "Your team may vote on this date", so that I understand what the switch does.
11. As an opponent captain, I want turning my team's Votable off to remove the date from my team's poll, so that my players are not asked about a date we cannot play.
12. As an opponent captain, I want turning it back on to restore the date, so that I can correct a mistake before confirmation.
13. As an opponent captain, I want my Votable switch to be a no-op on a date the organizer has already made non-votable, so that my toggle never silently targets a date already out of both polls.
14. As an opponent captain, I want an "Accepted" switch per date, so that I can mark the dates my side will accept.
15. As an opponent captain, I want the tooltip "Accept this date — the organizer may confirm it", so that I understand Accepted is what lets the organizer lock a date.
16. As an opponent captain, I want to un-Accept a date, so that I can correct a mistake before confirmation.
17. As an opponent captain, I want my scoped view to keep showing only my team's roster, tallies, and clash lines, so that I never see the organizer's side.
18. As an opponent captain, I want to keep using one link with the opponent-captain password, so that the rename does not change how I get in.

19. As an opponent-side player, I want a date my captain turned Votable off to disappear from my vote view, so that I only vote on dates my captain put forward.
20. As an opponent-side player, I want a submission targeting such a date to be rejected, so that tallies stay consistent.
21. As an organizer-side player, I want the opponent's Votable switch to leave my poll untouched, so that only the organizer's symmetric switch controls what I see.
22. As an organizer-side player, I want the opponent's Accepted flag to leave my poll untouched, so that consent does not silently change my ballot.

23. As a screenreader user, I want each date's Votable switch to have a distinct accessible name containing the date, so that I can tell the rows apart.
24. As a screenreader user, I want each Accepted switch to have a distinct accessible name containing the date, so that I can tell the rows apart.
25. As a screenreader user, I want each toggle to announce its on/off state, so that I know the current setting.
26. As a screenreader user, I want the opponent page's switches to be announced with their team scope, so that "Votable" on the opponent page is not mistaken for the organizer's switch.

27. As an organizer with existing postponements, I want a previously rejected date to remain outside the opponent's poll and unconfirmable, so that upgrading does not reopen dates the opponent already ruled out.
28. As an organizer with existing postponements, I want a previously acceptable date to remain Accepted and confirmable, so that in-flight negotiations are not reset.
29. As an organizer with existing postponements, I want a session with no flags to read as fully votable and not accepted, so that untouched sessions behave exactly as before.
30. As a maintainer, I want the migration to happen at read time without rewriting stored data, so that rollback stays trivial.

31. As a German-speaking captain, I want the poll switch labelled "Abstimmbar" and the consent flag "Angenommen", so that the UI reads in my language.
32. As a captain in fr-CH or it-CH, I want the English text per ADR-0016, so that the fallback stays consistent.
33. As a maintainer, I want the confirm-blocking effect of the opponent's Votable switch recorded as deliberate and undisclosed, so that a future reader does not "fix" it by adding a chip or tooltip.
34. As a maintainer, I want the domain glossary to name the new terms, so that code, UI, and docs speak one vocabulary.

## Implementation Decisions

- **Two opponent flags, re-pitched.** `ProposedDate` drops the negation `vetoed` and the adjective `acceptable`, gaining instead `opponentVotable` (opponent-scoped, **default `true`**, the inverse of the old `vetoed`) and `accepted` (same polarity as the old `acceptable`, default `false`). The organizer's symmetric `votable` is unchanged.
- **`Votable` on both captain pages, one flag each.** The opponent page labels its switch "Votable", identical to the organizer's, but it writes `opponentVotable`; the organizer's writes the symmetric `votable`. The two are distinct flags with distinct fields; only the word is shared.
- **Domain operations renamed and inverted.** `setVetoed` becomes `setOpponentVotable(session, id, opponentVotable)`, a no-op when the date's organizer `votable` is false (mirroring the existing guard). `setAcceptable` becomes `setAccepted(session, id, accepted)`, a symmetric toggle.
- **Poll scoping.** `pollDates` for the non-organizer team keeps dates whose `opponentVotable` is true (the inverse of the old `!vetoed` filter). This is the filter the join vote view and vote submission already go through, so the inversion reaches the player-facing surface for free.
- **Confirmation invariant.** `confirmDate` succeeds only when the date is `votable`, `opponentVotable`, and `accepted`; otherwise a no-op returning the unchanged session.
- **Read-time migration only.** `normalize` maps legacy `vetoed === true` to `opponentVotable === false` and legacy `acceptable === true` to `accepted === true`; missing fields default to `opponentVotable: true`, `accepted: false`. Nothing is rewritten in storage, matching the existing read-time normalization seam.
- **Opponent endpoints renamed.** The `/veto` toggle becomes a team-scoped votable toggle and `/acceptable` becomes `/accepted`; the boolean query parameters follow the new field names.
- **Edit-view chips.** `date_vetoed` is dropped entirely. `date_acceptable` becomes the `Accepted` chip. No chip is shown for the opponent's Votable switch being off.
- **Deliberate, undisclosed block.** The opponent's `Votable: off` blocks confirmation, but this is intentionally not surfaced: no tooltip mention, no organizer chip. A captain who silences their poll has also blocked the date, and the organizer learns only from a failed confirmation. This is a recorded decision, not an oversight.
- **Confirm-error message** names the requirement in the new vocabulary: only dates the opponent has Accepted and left votable can be confirmed.
- **Accessible names carry scope and date.** Each row's toggle gets an accessible name that includes the specific date, replacing the current single repeated label, so screenreader users can distinguish rows.
- **Localization.** `opponent_veto*` keys become opponent-votable keys, `opponent_acceptable*` become accepted keys, `date_acceptable` is renamed, `date_vetoed` removed, and the confirm-error key renamed; German gets "Abstimmbar" / "Angenommen", and fr-CH/it-CH reuse English per ADR-0016.
- **No storage schema change.** A Postponement is a serialized JSON blob; only its normalized shape changes.

## Testing Decisions

- **Test external behaviour, not implementation.** Assert on the resulting `Postponement` state and on what the user or screenreader sees — never on intermediate steps. A good test here fails if the polarity, the poll scoping, or the confirmation gate is wrong, and survives a rename of private helpers.
- **Domain logic is unit-tested at the `PostponementRules` seam** (`postponement.spec.ts`), the highest seam in the codebase, using `FakePostponementRules` to fix `newId`/`now`. Prior art: the existing `setVetoed` / `setAcceptable` / `pollDates` / `confirmDate` specs. Cover: the inverted toggle's polarity and its no-op on non-votable dates; the Accepted toggle; the opponent poll hiding dates whose `opponentVotable` is off while the organizer's own poll is unaffected; and confirmation succeeding only for `votable && opponentVotable && accepted`, no-op otherwise.
- **Migration is unit-tested at the `normalize` seam** (`session-store.spec.ts`), which already exists for read-time normalization. Cover: legacy `vetoed: true` normalizes to `opponentVotable: false`; legacy `acceptable: true` normalizes to `accepted: true`; absent flags normalize to fully-votable, not-accepted; and the result is not written back.
- **The opponent route pipeline is tested at its existing seam** (`opponent-handlers.spec.ts`, `run-opponent-command.spec.ts`, `render-opponent.spec.ts`, `opponent-page.spec.tsx`): the renamed toggle endpoints apply the right operation, and the rendered switches carry the new labels, tooltips, and per-row accessible names.
- **The edit surface is tested at its existing seam** (`edit-handlers.spec.ts`, `edit-page.spec.tsx`, `proposed-dates-section.spec.tsx`): the `Vetoed` chip no longer renders, the `Accepted` chip renders, and an invalid confirmation is a no-op with the new message while a valid one succeeds.
- **Happy path and likely error paths are covered in e2e** via the existing Page Objects (`OpponentPage`, `EditPage`). Prior art: `opponent-captain.e2e.ts`, `postponement-editing.e2e.ts`, `join-voting.e2e.ts`. Cover: the opponent captain turns their Votable off and the date disappears from the opponent's vote view; turning it back on restores it; the organizer confirms an Accepted date end-to-end; confirming a date whose opponent Votable is off is refused.
- **Accessibility checks** (`checkA11y`) run on the opponent and edit surfaces, matching the existing e2e conventions; the per-row accessible names are asserted behaviourally rather than by selector.
- **Localization** is exercised through the existing locale-sensitive e2e coverage, so missing or mismatched keys surface there rather than in ad-hoc string assertions.

## Out of Scope

- Any change to the organizer's symmetric `votable` switch, its semantics, or the way the organizer's own poll is computed.
- The iCal feed's treatment of opponent flags: it keeps listing dates by the symmetric `votable` flag, unchanged.
- Surfacing the opponent's confirm-blocking Votable switch to the organizer (no chip) or to the opponent (no tooltip mention) — deliberately excluded.
- A new named opponent-captain entity, accounts, or recovery.
- Cookie-based capability transport; the query-parameter pattern stays.
- Any change to the click-tt scrape/creation wizard.
- Creating an ADR for the inverted flag and its hidden block; the decision is recorded here and in `CONTEXT.md` for now.

## Further Notes

- The domain glossary (`CONTEXT.md`) already carries the new vocabulary — `Opponent Votable` and `Accepted` entries, the `Proposed Date` flag list, the renamed operations, and the Opponent Captain bullet — so this spec changes code and locale strings to match the glossary, not the other way round.
- This reworks the flags introduced by `.scratch/two-captain-flow/spec.md`; the four-secret model, the opponent-captain route, and the four-secret share links are unchanged.
- The hidden block is the one decision a future reader is most likely to question. The history: disclosure via tooltip and via an organizer chip were both considered and explicitly declined in favour of silence. If it is ever revisited, the change is a tooltip string and one chip — the domain invariant does not move.
- The German word "Abstimmbar" already exists for the organizer's switch (`votable_short`), so the opponent label reuses an established term rather than introducing a new one; "Angenommen" replaces the current "Akzeptabel".
