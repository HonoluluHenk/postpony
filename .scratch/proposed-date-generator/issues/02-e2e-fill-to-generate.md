# 02: E2E fill-to-generate flow

**What to build:** The end-to-end test proves the fill-to-generate grid from the organizer's point of view: a user opens a Postponement in the edit view, fills the time on two of the seven weekday rows and leaves the rest blank, clicks Generate, sees exactly those two Proposed Dates appear in the proposed-date list, sees the success toast reporting 2 dates, and sees the status chip move to Voting. The test also asserts a blank day produced nothing and that the generator block is absent once the Postponement is Confirmed. The page object's generator helper is reworked to drive the fixed grid (fill times by weekday, no add/remove interaction).

**Blocked by:** 01 (fixed weekday grid + time-only submit)

**Status:** ready-for-agent

- [ ] Page object exposes driving the fixed grid: fill a time for a given weekday row, leave rows blank, submit generate.
- [ ] Happy path: fill 2 weekday times, generate → exactly those 2 dates visible in the proposed-date list, toast shows count 2, status chip transitions to Voting.
- [ ] A blank weekday row produced no Proposed Date.
- [ ] Generator block absent when the Postponement is Confirmed.
- [ ] Generated dates behave like hand-added ones (deletion of an unwanted generated date still works).