# 07: Confirm Date is the only filled button; outlined delete; password copy

**What to build:** On each Proposed Date row only Confirm Date is a filled button; delete is an outlined icon button. The success message shows a copy button next to the organizer password so saving it is one tap.

**Blocked by:** 02 (Proposed Date card shows full date and all chips on every width)

**Status:** ready-for-agent

- [ ] Delete Proposed Date button uses the outlined variant with its icon and keeps its aria label
- [ ] Votable switch and Confirm Date button unchanged
- [ ] Organizer password in the success message has the existing clipboard button with the password as copy payload and a translated aria label (en + de)
- [ ] Unit render specs: delete button variant class; password copy button present with correct payload
- [ ] e2e: clicking the password copy button shows the copied feedback; delete still works
- [ ] `checkA11y` passes; baselines regenerated
- [ ] `npm run verify` passes
