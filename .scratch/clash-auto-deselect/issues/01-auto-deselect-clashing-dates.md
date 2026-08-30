# 01: Auto-deselect newly proposed Proposed Dates that clash

**What to build:** When the organizer proposes a new Proposed Date and the clash check finds it has a Clash, that date is automatically deselected — its `votable` flag is set to `false` at proposal time, so it is hidden from both teams' polls and cannot be confirmed. This applies to both proposal paths (adding a single date and the Proposed Dates Generator weekly slate) and only to the date(s) just proposed: pre-existing dates keep their current `votable`, and the manual "refresh schedule check" action still only updates the clash chips without touching `votable`. A clean new date stays votable; a match without team identities (no clash data) leaves all newly proposed dates votable as today. The deselected date still appears in the proposed-date list with its votable switch off and its clash chip, and the organizer can flip it back on by hand.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] After a single-date proposal, a newly added date with a Clash is persisted with `votable: false` (clash data still attached).
- [ ] After a single-date proposal, a newly added date with no Clash is persisted with `votable: true`.
- [ ] After a Proposed Dates Generator submit, only the newly generated dates that clash are `votable: false`; the clean generated dates stay `votable: true`.
- [ ] When a further proposal runs, a pre-existing date keeps its current `votable` (including one previously flipped by the organizer).
- [ ] The manual "refresh schedule check" action updates clash chips but does not change any date's `votable`.
- [ ] For a match with no team identities (or a failed scrape), a newly proposed date stays `votable: true`.
- [ ] On the edit page, a newly proposed clashing date shows votable-off with its clash chip and remains in the list.
- [ ] On the vote page, a newly proposed clashing date is hidden from the poll while a clean date stays visible and votable (updated e2e proves the end-to-end flow).
