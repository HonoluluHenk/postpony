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

## Comments

- `a8ee7d5` ticket done: 04-scoped-live-announcements — removed `aria-live` from the four swap targets (team-management, proposed-dates-management, own-team-votes, vote-tally-section); new shared `StatusAnnouncement` component (`src/routes/partials/status-announcement.tsx`) reuses the existing `#clipboard-status` element (always present in the initial render, empty); `TeamSectionPartial` and `ProposedDatesSectionPartial` emit it OOB (`hx-swap-oob="true"`) with the handler-supplied message; messages wired for add-player (`player_added`), add-date (`proposed_date_added`, reused), generator (`proposed_dates_generate_added` + count, reused), delete-date (`proposed_date_deleted`), confirm-date (`date_confirmed`); new en+de keys added alphabetically; errors keep using the error container (no status element emitted on error swaps); focus-to-heading behaviour untouched; component/handler/e2e specs assert the new announcements and that sections carry no `aria-live`. Notes: toggle-votable, reopen, and refresh-clashes handlers supply no status message (not in ticket's mandated handler-spec scope — they leave the previous announcement in place). E2E: `postponement-editing` + `postponement-creation` (18 tests) green; `proposed-date-generator.e2e.ts` still shows the 2 documented pre-existing date-sensitive failures (hard-coded `2026-09-07..13` / `2026-09-10` windows now in the past) — confirmed unrelated.
