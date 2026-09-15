# 04: Opponent-captain scoped view

**What to build:** the opponent captain opens their share link and gets a scoped surface where they manage only their own team: add/remove players (removal cascade-deletes votes), veto votable dates, and mark dates acceptable — seeing only their own team's tallies and nothing of the organizer's side.

**Blocked by:** 02 — Per-team secrets, creation & join

**Status:** ready-for-agent

- [x] A new opponent-captain surface is gated by the opponent-captain password and is reachable from the edit page's opponent-captain share link.
- [x] The opponent captain can add and remove players on their own team only; removing a player cascade-deletes that player's votes.
- [x] The opponent captain can veto a votable date and un-veto it; vetoing a non-votable date is a no-op.
- [x] The opponent captain can mark a date acceptable and un-mark it.
- [x] The opponent captain sees their own team's vote tallies only, never the organizer's team's tallies.
- [x] The opponent captain has no affordance to propose dates, flip the symmetric `votable` switch, or confirm a date.
- [x] Unit specs cover the scoped handlers; e2e covers the opponent captain's roster edit, veto, and acceptable flow, with `checkA11y` on the new surface.

## Comments

- `d6cedfa` — `feat(opponent): scoped opponent-captain view`: new `/opponent` router gated by `requireOpponentCaptain` (password compared against `opponentCaptainPasswordHash`), a scoped `OpponentPage` (own roster add/remove with vote cascade, own-team tallies, per-date veto/acceptable toggles), the opponent-captain share link added to the edit page, plus unit and e2e coverage with `checkA11y`.
