# 04: Creation seam

**What to build:** Creating a Postponement is a domain operation, not a route assembling twenty fields by hand. `PostponementRules.create` takes the scraped match fields and the precomputed password hashes, derives the display name, and owns the Draft invariants — status, reopen count, organizer team, empty Proposed Dates and Votes, and the ids and creation timestamp through the existing `newId`/`now` seam. The second clock (`Timestamp`) is deleted, and creating a Postponement becomes testable without a route or a store.

**Blocked by:** 03 (agreed order)

**Status:** ready-for-agent

- [ ] `PostponementRules.create(input)` returns a Draft Postponement with name, ids and `createdAt` produced through `newId`/`now`
- [ ] The create route calls it, passing scraped fields and precomputed hashes, and keeps the scraping and password hashing
- [ ] The name derivation moves into `create` (route no longer computes it)
- [ ] `timestamp.ts` and `App.timestamp` are deleted, and no code references them
- [ ] A unit test constructs a Postponement through `create` with a fake id/clock and asserts the Draft invariants
- [ ] E2E create/scrape flow and screenshot baselines are unchanged and green
- [ ] `npm run verify` passes

## Comments
