# 04 — Edit view: confirm and reopen

**What to build:** the organizer can lock a final date alone, and later reopen the postponement for another round of voting. Each proposed date that has been proposed to the opponent (`votableByOpponent`) gains a Confirm control; confirming sets `confirmedProposedDateId` and status → `Confirmed`. Dates never proposed to the opponent cannot be confirmed. When `Confirmed`, the edit view shows a Reopen control: reopening returns to `Voting`, increments `reopenCount` (the confirmed date is kept as history, all votes and date flags are preserved), and any new dates added afterwards start `votableByOpponent: false` until the organizer explicitly flips them. A "reopened N times" note is shown on the edit view and the invite view (exact wording is UI fog, settled via the localization skill). The edit view also carries a note that the organizer can use the own-team link to participate as a team member and vote. New locale keys cover confirm, reopen, the reopen-count note, and the organizer
note.

**Blocked by:** 01, 03

**Status:** ready-for-agent

- [ ] Confirm control appears only on `votableByOpponent` dates; confirming sets `confirmedProposedDateId` and status → `Confirmed`.
- [ ] Confirming a date that is not `votableByOpponent` is not possible (no endpoint effect).
- [ ] When `Confirmed`, edit view shows a Reopen control; reopening returns to `Voting`, increments `reopenCount`, and preserves history, votes, and date flags.
- [ ] New dates added after a reopen start `votableByOpponent: false` and need an explicit flip.
- [ ] Reopen count shown on edit and invite views.
- [ ] Organizer-as-member note shown on the edit view.
- [ ] Unit tests: confirm happy path, confirm rejection of a non-proposed date, confirm idempotence, reopen status/count/history/votes.
- [ ] e2e: confirm → status Confirmed; reopen → Voting with count visible; post-reopen date not opponent-votable until flipped.
