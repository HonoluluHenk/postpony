# 03: Opponent captain page: Votable & Accepted

**What to build:** the opponent captain's date controls read in the shared vocabulary and their accessible names identify each date. Each date row offers "Votable" (on by default, tooltip "Your team may vote on this date") and "Accepted" (tooltip "Accept this date — the organizer may confirm it"). Turning Votable off removes the date from the opponent team's poll — including the players' vote view — and can be turned back on. The toggle endpoints and outcome announcements follow the new names, and German reads "Abstimmbar" / "Angenommen". The scoped view is otherwise unchanged.

**Blocked by:** 02 — Domain rules adopt Opponent Votable & Accepted

**Status:** ready-for-agent

- [ ] The row shows "Votable" and "Accepted" switches with the stated tooltips, in English and German.
- [ ] Each switch's accessible name includes its date, so repeated rows are distinguishable by a screenreader.
- [ ] Turning Votable off removes the date from the opponent team's vote view and rejects a vote submission targeting it; turning it on restores it.
- [ ] The toggle endpoints and their announcements use the new names; no "veto"/"acceptable" wording remains on this surface.
- [ ] The opponent e2e happy path and the accessibility check pass.
