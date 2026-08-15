# Match Creation Flow — Manual or Scrape, with In-Place Change

**Status:** ready-for-agent

## Problem Statement

Creating a Postponement only collects a free-form name, so a fresh session has no match details. The click-tt scraper lives on the edit page and silently abandons the session the user just created, minting a brand-new Postponement instead of filling the current one. Users who want a proper match context must scrape first or get a name-only session; there is no way to enter match details by hand, and no way to correct a wrong match after creation.

## Solution

Creation forks into two equal paths at the start page: create a Postponement manually (home team, guest team, date, time) or find the match via the click-tt scraper. Both produce a Postponement with typed match details and an auto-derived name. The edit page no longer offers scraping; it shows a match summary with a "change match details" link that updates the session in place.

## User Stories

1. As an organizer, I want to create a Postponement by entering the home team, guest team, and original match date and time by hand, so that I can use the app without touching click-tt.ch.
2. As an organizer, I want to create a Postponement by scraping the match from click-tt.ch, so that the rosters and original date are filled in for me.
3. As an organizer, I want to see both creation options on the start page before I commit to either path, so that I can choose the method that fits my situation.
4. As an organizer, I do not want to enter a name, because the app can derive one from the match details.
5. As an organizer, I want the derived name to match the locale I'm reading in, so that the name reads naturally to me.
6. As an organizer, I want every Postponement I create to carry match details, so that a name-only session never exists.
7. As an organizer, I want the edit page to show which teams and original date/time the Postponement is about, so that I can confirm I'm working on the right match.
8. As an organizer, I want to correct a match I picked wrong during creation without losing the session, its passwords, votes, or proposed dates.
9. As an organizer, when I correct the match by scraping, I want the rosters replaced with the new match's rosters, so that the player list reflects the actual match.
10. As an organizer, when I correct the match by hand, I want the existing players left alone, so that my manual roster work is not wiped.
11. As an organizer, I want to be asked for the original match date and time in the same locale format I see elsewhere in the app, so that typing a date feels consistent.
12. As an organizer who has already confirmed a date, I still want to be able to correct the match details, so that a mistake at creation is never fatal.

## Implementation Decisions

- **Start-page fork**: the start page shows three actions — create manually, find match on click-tt.ch, edit existing. The manual form lives on `/create`; the wizard lives under `/create/scrape` as today.
- **Manual creation**: the `/create` form collects home team, guest team, date, and time. The name field is removed. Submitting mints a new Postponement with `organizerTeam` defaulting to `home` and the usual Draft state.
- **Name derivation**: `name` stays a stored field but is always derived — "Home vs Guest – date time" formatted in the creator's locale tokens — by one shared domain function used by both the manual and scrape paths. The scrape path stops building the name inline.
- **Typed match details**: `homeTeam` and `guestTeam` become required-in-effect typed fields on the Postponement. `metadata` keeps scrape-only provenance (league, group, championship). Existing sessions are migrated by `SessionStore.normalize`, reading the legacy `metadata.match.*` shape into the typed fields when present.
- **Original date/time**: `originalMatchDateTime` accepts any valid locale datetime (no past/future rule), parsed by the existing locale-aware server parser (ADR-0016 format table) and stored in strict ISO form. The manual form reuses the same date input pattern as proposed dates.
- **Change mode**: the edit page's "change match details" link opens the manual form in change mode, with a cross-link to the wizard. Both carry `sessionId` + `ownerPassword`. The final POST loads that session, checks the owner password, and mutates it in place — same id, passwords, votes, proposed dates. The same forms without a session context mint a new session.
- **Players on change**: a manual change leaves players untouched; a re-scrape replaces the rosters with the newly scraped ones (no provenance bookkeeping).
- **Edit page UI**: the scrape button and its grid cell are replaced by a match summary (home vs guest, date/time) plus the change link. The scheduling-info region is never swapped by partials, so no partial-sync change is required.
- **Wizard breadcrumbs**: in change mode, back-navigation returns to the edit page instead of the create path.

## Testing Decisions

Good tests exercise external behavior — what the user sees and what the store holds — not handler internals.

- **Domain**: the name-derivation function is unit-tested across locales and both paths; prior art is `src/lib/postponement.spec.ts`.
- **Store migration**: `SessionStore.normalize` is tested for legacy `metadata.match.*` sessions; prior art is `src/lib/session-store.spec.ts`.
- **Route handlers (mock Hono)**: manual create-post (validation errors, mint + redirect, HX-Redirect path, derived name) and change mode (missing/incorrect owner password rejected, same session mutated in place, players untouched on manual change, roster replaced on re-scrape); prior art is `src/routes/create/create-post.spec.ts` and `src/routes/create/scrape/match-post.spec.ts`.
- **E2E (Playwright)**: start-page fork shows both options; manual create lands on edit with the match summary and no scrape button; a change-details round-trip preserves id and players; the scrape wizard is reached from the start page and still lands on edit with prefilled rosters; prior art is `e2e-tests/postponement-creation.e2e.ts` and `e2e-tests/scraping-flow.e2e.ts`, with their page objects updated.
- Coverage stays ≥80% for all metrics.

## Out of Scope

- Free-form naming or renaming of a Postponement.
- A venue field.
- Editing match details after the session is confirmed without the change-link flow (the change link remains available regardless of status).
- Tracking player provenance (which players came from a scrape).
- fr-CH/it-CH UI copy beyond the existing English fallback.
- Backend session listing beyond the existing edit-existing page.

## Further Notes

- ADR-0017 records the decision; the glossary's Match entry now references typed home/guest team fields.
- The ADR-0016 format table is the single source of truth for the manual date/time input grammar.
- The wizard templates are shared between mint and change modes; only the threaded session context and the final redirect differ.
