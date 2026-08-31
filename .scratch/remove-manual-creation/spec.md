# Spec: Scrape-Only Creation — Remove Manual Match Creation & Changing Match Details

Status: ready-for-agent

## Problem Statement

A Postponement's Match can currently be established two ways: the user types the home team, guest team, and date/time by hand on a manual create form, or they find the scheduled Match through the click-tt.ch scrape wizard. After creation, the user can also **change** which Match a Postponement references — either by re-editing the same hand-entry form, or by re-running the scrape wizard in "change mode" (which also swaps the rosters).

These two paths are legacy burden. Every real Match already exists on click-tt.ch, so hand-entry adds a redundant, error-prone way to mint a Postponement with no scrape provenance. And letting a live Postponement be re-pointed at a different Match mid-life, with rosters silently swapped and past votes/proposed dates left dangling against a now-different fixture, is a footgun the domain would rather not have.

## Solution

Make the click-tt.ch scrape wizard the **only** way to create a Postponement, and bind each Postponement to its Match **at creation permanently** — there is no way to change the Match it references afterwards. Remove the manual create form, the "change match details" action, and all change-mode plumbing. The edit page keeps a read-only Match summary so the Postponement's identity stays visible, but offers no editing of it.

## User Stories

1. As an organizer, I want to create a Postponement by finding its scheduled Match on click-tt.ch, so that the Match details are accurate and scrape-proven rather than hand-typed
2. As an organizer, I no longer see a hand-entry form for Match details (home team, guest team, date/time typed by me), so that I can't mint a Postponement against a Match that doesn't exist on click-tt
3. As an organizer, I want the start page to offer exactly one creation path (the scrape wizard), so that choosing how to create is not ambiguous
4. As an organizer, I want the scrape wizard to mint a new Postponement on every run, so that it never silently mutates an existing session
5. As an organizer of an existing Postponement, I want to see which Match it references (home vs guest, original date/time) read-only on the edit page, so that I always know what fixture I'm postponing
6. As an organizer of an existing Postponement, I want no "change match details" button and no way to re-point the Postponement at a different Match, so that the fixture a Postponement refers to is stable for its whole life
7. As an organizer, I want an existing Postponement's rosters, votes, and proposed dates to stay consistent with the Match it was created against, so that changing the Match never leaves stale data behind
8. As an organizer, during re-opening or other operations I want the original Match's teams and date/time still available, so that the Match identity survives the Postponement's lifetime
9. As an organizer, I want the clash and venue-occupancy checks to keep working off the Match's click-tt team identities, so that removing hand-entry and change mode doesn't degrade scheduling checks
10. As an organizer, I want the invitation and ownership flows (join link, owner password) unchanged by this removal, so that existing Postponements keep functioning

## Implementation Decisions

### Creation is scrape-only

- The manual create form and its route handlers are deleted. `/create` no longer renders a hand-entry form and its POST no longer mints or updates a session.
- The scrape wizard (`/create/scrape` and its steps) becomes the single creation entry point and the only place a `Postponement` is minted. The start page's creation affordance points only at the wizard.
- The scrape wizard's final POST handler collapses to mint-only: it always creates a new `Postponement` (new id, new owner/invitation passwords), never an in-place update.

### No changing of match details

- All "change mode" logic is removed: the `sessionId` + `ownerPassword` threading through the create page and every scrape-wizard step view, the route-level guard that verified the owner before mutating an existing session, and the "change match details" / "change via scrape" affordances.
- An existing Postponement's `homeTeam`, `guestTeam`, `originalMatchDateTime`, team identities, rosters, and provenance are never rewritten by any create/scrape route.

### Edit page: read-only Match summary

- The edit page keeps a read-only summary of the referenced Match (home vs guest, original date/time) so the Postponement's identity remains visible. The "change match details" action is removed; no edit affordance remains on the cell.

### Model simplification

- The `metadata` provenance field is removed from the `Postponement` model and from the scrape path's writes. It is not read anywhere today; removing it is purely a write-model simplification.
- `homeTeamIdentity` / `guestTeamIdentity` (the click-tt identities) are **retained** — the clash and venue-occupancy checks compute off them.
- The `SessionStore` legacy read-time migration that lifted match details out of an untyped `metadata.match.*` shape is removed. This is safe because the app is pre-release / fixtures-only (no live pre-ADR-0017 rows exist).
- `originalMatchDateTime` locale parsing tied to hand-entry is no longer exercised by any creation flow; the scrape path supplies the date/time via the click-tt parser as before.

### Documentation

- The glossary (`CONTEXT.md`) `Match` entry is updated so a Postponement's Match is always scraped from click-tt.ch at creation and never editable afterwards (drop "or entered by hand", drop the in-place change semantics).
- Two-path creation is no longer the model. Note that ADR-0017 (two-path match creation, with in-place change) is superseded by this decision; record the supersession (a short successor ADR or a status update to ADR-0017) so the reason the manual path vanished is not lost.

### Localization

- Translation keys that exist only for the removed features (`create_new`, `create_postponement_title`, `change_match_details`, `change_match_details_title`, `change_via_scrape`, `save_changes`) are removed from `en.json`/`de.json`; fr-CH/it-CH keep mirroring English per ADR-0016.

## Testing Decisions

- A good test asserts external behavior only: which routes exist, what a create/scrape POST produces, that no route mutates an existing session, and that the edit page renders the read-only Match summary with no edit affordance. It must not assert on the presence/absence of specific implementation files or internals.
- Seams (existing, highest point, no new seams):
    - the Hono route/handler layer — the single primary seam. The app's observable contract is "what routes exist and what they do," and existing handler-level specs (`create-post`, `create-get`-family, the scrape-wizard spec) plus e2e already exercise exactly this seam.
    - `SessionStore` normalize — the seam for the `metadata` field + legacy-migration removal, via the existing session-store spec.
- Modules tested:
    - route handler specs: a scrape POST mints a new Postponement and redirects to its edit page; no request to any create/scrape route with a `sessionId`/`ownerPassword` mutates an existing session (that shape is rejected/ignored); no manual create route exists.
    - start-page / index: only the scrape-wizard creation entry is offered.
    - edit page handler spec: renders the read-only Match summary; no change-affordance is produced.
    - `session-store.spec.ts`: no legacy `metadata.match` migration, and the `metadata` field is gone from the normalized shape.
- Prior art: `create-post.spec.ts` and the scrape-wizard spec (route-level minting), `postponement-creation.e2e.ts` / `scraping-flow.e2e.ts` / `start-page.e2e.ts` (full flows), `edit-id-get.spec.ts` style edit-page rendering, `session-store.spec.ts` (normalize).
- E2E: happy path = scrape wizard creates a Postponement and lands on its edit page showing the read-only Match summary. Likely error paths = reaching a create/scrape route with leftover `sessionId`/`ownerPassword` parameters behaves as a fresh mint (no mutation), and the edit page shows no change action.
- Run the full `verify` gate (lint → test → build → e2e) with all coverage metrics ≥ 80%.

## Out of Scope

- Editing a Postponement's players, proposed dates, votes, or status (the rest of the edit page is unchanged).
- Introducing an edit-match feature by any other means.
- Migrating any existing stored Postponements (none exist in production; fixtures only).
- Changing the clash or venue-occupancy computation (they continue off the retained team identities).

## Further Notes

- Scope was settled by direct questioning: remove the whole manual create form, remove both hand-entry *and* re-scrape change flavors, keep a read-only Match summary, strip the wizard's change-mode threading, simplify the model (`metadata` gone, identities kept), drop the legacy migration (pre-release), and do a full test sweep to scrape-only.
- The re-scrape path is what swapped rosters on an existing session; removing it is what keeps rosters/votes/proposed dates consistent with the Match for the Postponement's whole life.
- Glossary updates (`Match` scrape-only wording) and the ADR-0017 supersession note are part of the deliverable.
