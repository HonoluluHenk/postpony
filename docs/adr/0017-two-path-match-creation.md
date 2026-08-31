# ADR 0017: Two-Path Match Creation — Manual or Scrape, with In-Place Change

## Status
Superseded by ADR-0024 (scrape-only creation; a Match is never editable afterwards).

## Context
Creation only collected a free-form name, so a freshly created Postponement had no match details. The click-tt scraper lived on the edit page and always minted a brand-new Postponement, silently abandoning the session the user had just created. Users who skipped scraping ended up with name-only sessions; there was no way to enter match details by hand and no typed home/guest team fields in the model.

## Decision

### Two creation paths, forked at the start page

- The start page offers three actions: create a postponement manually, find the match on click-tt.ch, and edit an existing postponement.
- **Manual** (`/create`): a form with home team, guest team, date, and time. Submitting mints a new Postponement.
- **Scrape** (`/create/scrape`): the existing four-step wizard, unchanged, mints a new Postponement.
- Both paths produce the same result: a Postponement with typed match details. No free-form name entry anywhere; `name` is derived as "Home vs Guest – date time" in the creator's locale tokens by a shared domain function.

### Typed match details

- `homeTeam` and `guestTeam` become typed fields on `Postponement`. Existing sessions are migrated in `SessionStore.normalize` from the legacy untyped `metadata.match.*` shape.
- `metadata` retains scrape-only provenance (league, group, championship).
- `originalMatchDateTime` accepts any valid locale datetime (no past/future rule) and stays in strict ISO storage form.

### Edit page: summary instead of scrape button

- The scrape button is removed from the edit page. The freed cell shows a match summary (home vs guest, date/time) plus a "change match details" link.
- **Change mode**: the link reopens the manual form or the wizard, carrying `sessionId` + `ownerPassword`; the final POST mutates that session in place — same id, passwords, votes, and proposed dates. Ownership is guarded by the existing `ownerPassword` check. Without a session context the same forms mint a new session.
- A manual change leaves existing players untouched; a re-scrape replaces the rosters with the newly scraped ones.

## Considered Options

- **Fork after name entry** — rejected: the name step became pointless once the name is derived, and it kept the ambiguity of "which session does the scrape fill?"
- **Scraping mints a new session from the edit page** — rejected: it abandoned the user's current session and made the edit-page button actively harmful.
- **Reuse the untyped `metadata` shape for manual details** — rejected: match details become a real, two-path concept; "stringly" storage contradicts the strong-typing rule.

## Consequences

- Name-only sessions no longer exist; every Postponement carries match details from creation.
- `create-post` gains match-detail validation and locale-aware date parsing (reusing the ADR-0016 format table).
- Creation e2e flows (`postponement-creation`, `scraping-flow`) are rewritten to the new entry points.
- The wizard's drill-down templates are shared between mint and change modes, differing only in the session context they thread through.
