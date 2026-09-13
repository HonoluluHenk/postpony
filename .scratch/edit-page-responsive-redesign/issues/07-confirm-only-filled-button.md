# 07: Confirm Date is the only filled button; outlined delete; password copy

**What to build:** On each Proposed Date row only Confirm Date is a filled button; delete is an outlined icon button. The success message shows a copy button next to the organizer password so saving it is one tap.

**Blocked by:** 02 (Proposed Date card shows full date and all chips on every width)

**Status:** ready-for-agent

- [x] Delete Proposed Date button uses the outlined variant with its icon and keeps its aria label
- [x] Votable switch and Confirm Date button unchanged
- [x] Organizer password in the success message has the existing clipboard button with the password as copy payload and a translated aria label (en + de)
- [x] Unit render specs: delete button variant class; password copy button present with correct payload
- [x] e2e: clicking the password copy button shows the copied feedback; delete still works
- [x] `checkA11y` passes; baselines regenerated
- [x] `npm run verify` passes

## Comments

- `a7bbd68` ticket done — made Confirm Date the only filled button on each Proposed Date row (`.button`, was `.button.outline`; delete stays `.button.outline`), added the existing `clipboard-btn` next to the organizer password with the password as `data-copy` and a new `copy_organizer_password` label in both locales, added the delete-variant + password-copy unit render specs, added the password-copy e2e announcement test + `organizerPasswordCopyButton` page object, and regenerated the four edit-page screenshot baselines. `npm run verify` green (lint, unit coverage ≥80%, build, 108 e2e).
- `a4bcefd` review — clean two-axis pass; one judgement call (inline clipboard-button repetition is per the ticket's "reuse existing markup" instruction), no blocking findings, no `review-fixed` needed. Note: Confirm Date was already `.button.outline` in the worktree, so the title's "only filled button" required making it filled — its behaviour/text and the votable switch are unchanged.
