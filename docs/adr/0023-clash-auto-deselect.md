# ADR 0023: Schedule Clash Detection and Auto-Deselect of Clashing Proposed Dates

## Status

Accepted

## Context

A postponed match must land on a date that does not collide with either team's
other scheduled games. To support that, the app scrapes both teams' click-tt
schedules and computes, for each Proposed Date, which scheduled games fall
within the date's range plus a fixed two-hour buffer on either side — these are
"Clashes". The clash data is shown to the organizer (clash lines/chips, a warning
at confirm time) and, because it is stored on each Proposed Date, appears on the
vote page too. But until now a clashing date was still added as votable and went
straight into both teams' polls, leaving the organizer to notice the chip and flip
the votable switch off by hand.

## Decision

Clash detection is a pure computation (`computeClashes`) driven by the scraped
schedules, applied at proposal time and at an explicit manual refresh, with the
postponed match itself excluded and results split per team. On top of that, when
a **newly proposed** date (added via the single-date field or the weekly
generator) is found to have a Clash, it is automatically **deselected**: its
`votable` flag is set to `false`, so it is hidden from both teams' polls and
cannot be confirmed. The deselection applies only to the date(s) just proposed
and only on the proposal path; the manual refresh action only updates the clash
snapshot and never touches `votable`, so the organizer's manual re-enable is
always respected. Matches without click-tt identities produce no clash data and
are never deselected. The organizer can always flip the votable switch back on
to override the automatic choice.

## Rationale

Auto-deselect turns the clash check from information into a safe default: clashing
dates no longer silently pollute both teams' voting, which is the common failure
the feature exists to prevent. Keeping it "proposal-time only" and "new dates
only" makes it a default rather than a hard lock — the organizer retains full
control via the votable switch, and refreshing never undoes a deliberate choice.
Reusing the existing `votable` flag keeps the model unchanged: a non-votable date
is already hidden and already a no-op for confirmation, so deselection composes
with the domain rather than adding a new state. Clash detection itself is a
heuristic (a fixed two-hour buffer from a third-party schedule), so it should
inform the default but never remove the organizer's ability to confirm a date
they judge acceptable — which is why the confirm-time clash warning is kept and
made more noticeable rather than deleted.

## Consequences

- Newly proposed dates with a clash arrive with `votable = false`; clean dates
  stay votable.
- Pre-existing dates and manual votable overrides are never silently changed by a
  later proposal or refresh.
- Hand-entered matches (no identities) keep the informational-only behaviour.
- The two-hour buffer is a heuristic from a third-party source; it may over- or
  under-flag, which the persistent confirm warning and the manual switch mitigate.

## Alternatives considered

- **Block proposal of clashing dates outright / refuse to save them.** Rejected:
  the organizer might still want to keep the date in the list for later, and a
  scrape failure must never block proposing (the check degrades gracefully).
- **Delete clashing dates automatically.** Rejected: destroys organizer intent and
  history; deselection (votable off) is reversible and keeps the date visible with
  its clash chip.
- **Only warn, never auto-deselect (status quo).** Rejected: leaves clashing dates
  in the polls by default, the failure this feature addresses.
- **Re-deselect on every refresh, overriding manual re-enable.** Rejected: a
  refresh would silently undo the organizer's explicit choice.
