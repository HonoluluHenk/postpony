# 01: Add Venue domain types

**What to build:** Adds the `Venue` type to the domain model and updates all test builders so that the scaffolding is in place for subsequent tickets. No user-facing behaviour changes — purely a codebase preparation.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Add `Venue` interface to `src/lib/models.ts` with fields `venueNumber`, `name`, `address`, `postalCode`, `city`
- [x] Add `venues: Venue[]` to `Postponement` interface
- [x] Add `venueNumber?: number` to `ProposedDate` interface
- [x] Update test fixture builders (`__test-utils__/builders.ts`) to include `venues` and `venueNumber`
- [x] Update CONTEXT.md glossary with the `Venue` term
- [x] All existing unit tests pass (types are backward-compatible: `venues` defaults to `[]`, `venueNumber` is optional)

## Comments

- `af7ef16` — implementation: Venue/venues/venueNumber types, builder defaults, creation sites, normalize legacy defaults, CONTEXT.md; 520/520 tests pass, lint clean.
