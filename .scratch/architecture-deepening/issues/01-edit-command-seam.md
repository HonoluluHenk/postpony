# 01: Edit command seam

**What to build:** Every edit POST mutation runs through one command seam that loads the Postponement, guards against a missing session, applies one rule operation, saves only when the session changed, and renders the HTMX partial or redirects to the edit page. Each handler supplies its operation as a callback, a status message (which may be derived from the updated session), and any extra render fields; a handler may return a `Response` directly as an escape hatch. The organizer sees exactly the same behaviour as today for reopen, delete, visibility, confirm, players, add-dates and refresh-clashes.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] One seam module owns load, not-found guard, save-when-changed and partial-render-or-redirect
- [ ] All seven edit POST handlers route through it: reopen, delete, visibility, confirm, players, add-dates, refresh-clashes
- [ ] Confirm still emits the Clash warning instead of the plain confirmation when the confirmed date has Clashes
- [ ] Refresh-clashes still keeps the previous snapshot and renders the "previous results" message when the check fails and a snapshot exists
- [ ] Add-dates keeps its validation-failure 400 partials and its no-save branches via the escape hatch
- [ ] The characterization matrix from `edit-handlers.spec.ts` is ported to tests targeting the seam, then the legacy file is deleted or shrunk to non-edit coverage
- [ ] E2E tests and screenshot baselines are unchanged and green
- [ ] `npm run verify` passes

## Comments
