# ADR 0024: Scrape-Only Match Creation — Match is Never Editable

## Status
Accepted. Supersedes ADR-0017.

## Context
A Postponement's Match could be established two ways: hand-typed on a manual creation form, or found through the click-tt.ch scrape wizard. After creation the organizer could also change which Match a Postponement references — re-editing the manual form, or re-running the wizard in change mode (which silently swapped the rosters and left votes/proposed dates dangling against a different fixture). Every real Match already exists on click-tt.ch, so hand-entry added a redundant, error-prone way to mint a Postponement with no scrape provenance, and re-pointing a live Postponement was a footgun.

## Decision
The click-tt.ch scrape wizard is the **only** way to create a Postponement. Each Postponement is bound to its Match **at creation permanently** — the Match is never editable afterwards.

- The manual creation form and its route handlers are removed; `/create` no longer renders a hand-entry form.
- The scrape wizard is the single creation entry point and the only place a `Postponement` is minted; its final POST always creates a new Postponement (never an in-place update).
- All "change mode" plumbing is removed: `sessionId` + `ownerPassword` threading through create/scrape views, the owner-guard for mutating an existing session, and the "change match details" / "change via scrape" affordances.
- The edit page keeps a read-only Match summary so the Postponement's identity stays visible, but offers no way to change it.
- The `metadata` provenance field and the legacy `metadata.match.*` session migration are removed; `homeTeamIdentity`/`guestTeamIdentity` are retained for clash and venue-occupancy checks.

## Considered Options
- **Keep manual creation**: rejected — hand-entry is redundant and error-prone since every real Match already exists on click-tt.
- **Keep change mode (re-scrape / re-edit)**: rejected — re-pointing a live Postponement silently swapped rosters and left stale votes/proposed dates; a Match should be stable for the Postponement's whole life.

## Consequences
- There is exactly one creation path; choosing how to create is no longer ambiguous.
- Rosters, votes, and proposed dates stay consistent with the Match a Postponement was created against.
- Existing Postponements keep functioning; only creation and match-change behavior is removed.
