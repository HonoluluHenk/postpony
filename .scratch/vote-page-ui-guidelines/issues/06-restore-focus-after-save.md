# 06: Restore focus after the save reload

**What to build:** After a Vote save reloads the page, focus returns to the control the Participant just changed (the radio, or the set-all button), with no scroll jump, so a keyboard user can keep voting down the list without hunting for their place. Best-effort: if that control is gone from the reloaded page (date removed, status Confirmed) nothing happens.

**Blocked by:** 05 (Pending state for the auto-submitting vote form)

**Status:** done

- [x] After casting a radio Vote, focus is on that same radio once the page reloads
- [x] After a set-all tap, focus is on that set-all button once the page reloads
- [x] The page does not scroll when focus is restored
- [x] A missing target leaves focus untouched and does not error
- [x] e2e covers the radio case
- [x] `npm run verify` passes

## Comments

- `0f75afc` ticket done: 06-restore-focus-after-save — `initVoteForm` remembers the changed radio's `name`+`value` (or the set-all button's `value`) in `sessionStorage` before `form.submit()`, and `restoreVoteFocus()` on `pageshow` focuses it with `preventScroll` then clears the key; best-effort when the target is gone. Browser unit tests + a radio e2e (below-the-fold target, `scrollY === 0`) added.
- `ed5316a` review: 06-restore-focus-after-save — two-axis review, no findings.
- `npm run verify` passes (lint → test → build → 126 e2e). One full-suite flake in `focus-management.e2e.ts:34` passed on re-run.

