# Auto-deselect proposed dates that clash

Status: ready-for-agent

## Problem Statement

When the organizer proposes new dates on the edit page, the clash check already
runs and reports which dates clash with a scheduled game of one of the teams
(shown as clash lines/chips, and as a warning when confirming). But a clashing
date is still added as votable — it goes straight into both teams' polls and can
be confirmed. The organizer has to manually notice the clash chip and flip the
votable switch off themselves, every time.

## Solution

When a new Proposed Date is proposed and the clash check finds a Clash for it,
that date is automatically "deselected": its `votable` flag is set to `false`,
so it is hidden from both teams' polls and cannot be confirmed. The organizer can
still re-enable it by hand with the votable switch. The change applies only at
proposal time and only to the date(s) just proposed; existing dates are never
flipped, and the manual refresh action still only updates the clash chips.

## User Stories

1. As an organizer, I want a newly proposed date that clashes with a scheduled game to be automatically deselected (votable off), so that I don't have to remember to turn it off myself.
2. As an organizer, I want a newly proposed date that has no clash to stay votable, so that it enters both teams' polls as before.
3. As an organizer who proposes a whole weekly slate with the Proposed Dates Generator, I want any of the generated dates that clash to be deselected automatically, so that only clean dates go to the polls.
4. As an organizer who adds a single new date, I want it deselected automatically if it clashes, so that the single-add path behaves the same as the generator.
5. As an organizer, I want the deselected date to still appear in the proposed-date list with the votable switch off and its clash chip, so that I can see why it was deselected.
6. As an organizer, I want to be able to flip a deselected date's votable switch back on, so that I can override the automatic choice when I judge the clash acceptable.
7. As an organizer, I want the manual "refresh schedule check" action to keep updating the clash chips without flipping votable on any date, so that refreshing never overrides my manual choices.
8. As an organizer, I want a pre-existing date's votable state to stay untouched when I propose more dates, so that my earlier decisions aren't silently changed by a later proposal.
9. As an organizer of a hand-entered match (no click-tt identities, so no clash data), I want newly proposed dates to stay votable as today, so that the lack of team identities never blocks proposing.
10. As an organizer, I want to see a more noticeable warning when I confirm a date that clashes, so that the remaining manual-confirm override is clearly flagged.
11. As an opponent voting on a date, I want a newly proposed clashing date to be hidden from my poll, so that I never see or vote on a date the organizer chose to deselect.

## Implementation Decisions

- **"Deselect" is `votable = false`.** It reuses the existing `votable` flag and
  the `setVotable` operation — no new field, no deletion, no new state. A
  non-votable date is already hidden from both teams' polls and is a no-op for
  `confirmDate`, so deselection composes with the existing model unchanged.
  _Avoid_: removing the date, adding a "blocked" flag, changing `Status`.

- **Applies only to the newly proposed date(s), only at proposal time.** The
  clash check runs inside the shared proposal save path and currently calls
  `attachClashes`, which sets `clashes` on every date (existing ones included).
  The deselect must be narrower: only the dates just added get `votable = false`
  when their computed Clashes are non-empty. Pre-existing dates keep their
  current `votable` — this is what honours "respect manual override" for earlier
  dates.

- **Both proposal paths share the same logic.** The single-date add and the
  Proposed Dates Generator add must behave identically. The conditional lives
  in the shared save path, keyed on the ids of the date(s) being added, so one
  code path drives both.

- **Manual refresh is unchanged.** The `refresh-clashes` handler keeps recomputing
  and re-attaching the clash snapshot only; it never writes `votable`. This keeps
  the manual override stable across refreshes.

- **No-op when no clash data.** A hand-entered match (no `homeTeamIdentity` /
  `guestTeamIdentity`) or a failed scrape produces `undefined` clashes, so no
  date is deselected — exactly as today, the dates save votable.

- **Keep the confirm-clash warning; make it more noticeable.** The
  `clash_check_confirm_warning` message stays for the remaining manual-confirm
  override path (organizer re-enables a clashing date and confirms it), but is
  styled to stand out more (persistent, not a one-shot toast; higher visual
  weight).

- **No UI copy changes for the auto-deselect itself.** Matching the "fully
  automatic and silent" decision, no new notice or toast announces the
  deselection — the switch flipping off and the clash chip are the feedback.

## Testing Decisions

- **Test external behaviour, not implementation details.** A proposal POST is a
  good test when it asserts the effect on the stored session and on what renders:
  the newly added clashing date is `votable: false` and absent from the vote
  page, a clean new date is `votable: true`, and pre-existing dates keep their
  `votable`. Avoid asserting on internal helper names or call counts.

- **Primary seam: handler-level unit spec** (`src/routes/edit/id/edit-handlers.spec.ts`).
  This is the highest seam that still isolates the deselect logic, and it already
  hosts the existing post-handler tests for clash attaching/refresh
  (`edit-handlers.spec.ts` around lines ~666-796). Cover:
  - single-date add of a clashing date → `votable: false`, still persisted, clash
    data attached;
  - single-date add of a clean date → `votable: true`;
  - generator add where some rows clash and others are clean → only the clashing
    added dates are `votable: false`;
  - pre-existing dates keep their `votable` (including one previously flipped by
    hand) when a later proposal runs;
  - hand-entered match (no identities / failed scrape) → new clashing-eligible
    date stays `votable: true`.

- **Secondary seam: e2e** (`e2e-tests/clash-checks.e2e.ts`). The existing
  full-flow test currently asserts the old behaviour — that a newly proposed
  clashing date stays votable on the edit page and appears in the opponent's
  vote page poll. Update it to assert the new behaviour: the clashing date shows
  votable-off on the edit page and is absent from the vote page, while a clean
  date stays visible and votable there. This is prior art for the scrape-created
  match flow and the hand-entered "not checked" flow.

- **View-seam spec** (`proposed-dates-section.spec.tsx`) needs no new logic
  tests; it already covers rendering `votable` switches and clash chips.

## Out of Scope

- Automatic deselection on the manual "refresh schedule check" action (chips only).
- Deleting clashing dates or any change to a date's existence based on clashes.
- Changing whether an organizer can manually re-enable a clashing date.
- Any new UI copy, toast, or notice announcing an auto-deselection.
- Changes to how `computeClashes` finds Clashes (buffer, matching, exclusion).

## Further Notes

- The domain model and the existing Clash check already cover the detection
  side (`computeClashes`) and the display side (clash chips). This feature only
  adds the votable flip at proposal time — delete nothing, add one narrow rule.
- The clash auto-deselect behaviour, together with the existing detection
  mechanism, will be recorded in an ADR so a future reader understands why a
  freshly proposed clashing date arrives with `votable = false`.
- A duplicated `## Clash` glossary entry in `CONTEXT.md` should be consolidated
  into one as part of this work.
