# 01 — Manual match-details creation

**What to build:** The organizer can create a Postponement by entering home team, guest team, and the original match date/time by hand. No name is entered anywhere — the app derives it in the creator's locale. Both the manual path and the click-tt path produce the same typed match details and use the same name derivation, and existing sessions keep working after the model change.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `Postponement` carries typed `homeTeam`/`guestTeam` match details; legacy sessions are migrated in `SessionStore.normalize` from the old `metadata.match.*` shape
- [ ] The name is derived by one shared domain function ("Home vs Guest – date time", creator's locale tokens), used by both the manual and the click-tt creation paths
- [ ] The manual create form collects home team, guest team, and original date/time instead of a name; date/time is validated by the locale-aware server parser and stored in strict ISO form
- [ ] Submitting the manual form mints a new Draft Postponement (`organizerTeam` home) with the derived name and redirects to the edit page (HX-Redirect for partial requests)
- [ ] Unit tests: name derivation across locales and both paths; store migration of legacy sessions; manual create-post (validation errors, mint + redirect, HX-Redirect path)
- [ ] E2E: manual create flow rewritten to the match-details form and landing on the edit page with the derived name; the click-tt flow keeps passing with the shared derivation
- [ ] `npm run verify` passes; coverage ≥80% for all metrics
