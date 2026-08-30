# 01: Add Venue domain types

**What to build:** Adds the `Venue` type to the domain model and updates all test builders so that the scaffolding is in place for subsequent tickets. No user-facing behaviour changes — purely a codebase preparation.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Add `Venue` interface to `src/lib/models.ts` with fields `venueNumber`, `name`, `address`, `postalCode`, `city`
- [ ] Add `venues: Venue[]` to `Postponement` interface
- [ ] Add `venueNumber?: number` to `ProposedDate` interface
- [ ] Update test fixture builders (`__test-utils__/builders.ts`) to include `venues` and `venueNumber`
- [ ] Update CONTEXT.md glossary with the `Venue` term
- [ ] All existing unit tests pass (types are backward-compatible: `venues` defaults to `[]`, `venueNumber` is optional)
