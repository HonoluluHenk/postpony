# 04: One short status announcement per edit-page action

**What to build:** After any HTMX action on the edit page (add player, add or generate Proposed Dates, delete, toggle votable, confirm, reopen, refresh clashes), a screen-reader user hears one short outcome sentence such as "Player added" or "Proposed date added", instead of the entire swapped section being re-read. The large sections stop being live regions.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] `aria-live` removed from the team-management, proposed-dates-management, own-team-votes, and vote-tally swap targets
- [x] Initial edit-page render contains one visually-hidden `role="status"` element that is always present (partial-vs-initial rule)
- [x] Each edit partial updates that element out-of-band with a short, localized outcome message supplied by the handler; existing success keys are reused where they fit, new keys added in English and German where needed
- [x] Error outcomes continue to use the existing error container; the status element is not used for errors
- [x] Existing focus-to-section-heading behaviour on swap is unchanged
- [x] Component specs assert the sections no longer carry `aria-live` and that partials emit the OOB status element with the expected text
- [x] Handler specs assert the status message for add-player, add-date, delete-date, and confirm-date
- [x] E2E: after adding a player and after adding a Proposed Date, the status element contains the expected localized text; `checkA11y` passes
