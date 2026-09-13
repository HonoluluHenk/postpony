# 06: Restore focus after the save reload

**What to build:** After a Vote save reloads the page, focus returns to the control the Participant just changed (the radio, or the set-all button), with no scroll jump, so a keyboard user can keep voting down the list without hunting for their place. Best-effort: if that control is gone from the reloaded page (date removed, status Confirmed) nothing happens.

**Blocked by:** 05 (Pending state for the auto-submitting vote form)

**Status:** ready-for-agent

- [x] After casting a radio Vote, focus is on that same radio once the page reloads
- [x] After a set-all tap, focus is on that set-all button once the page reloads
- [x] The page does not scroll when focus is restored
- [x] A missing target leaves focus untouched and does not error
- [x] e2e covers the radio case
- [ ] `npm run verify` passes

## Comments
