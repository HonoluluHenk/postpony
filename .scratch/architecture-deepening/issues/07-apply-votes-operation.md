# 07: Apply votes operation

**What to build:** Applying submitted Votes is one domain operation instead of two hand-synced handler loops. `PostponementRules.applyVotes(session, submitted)` takes a pre-built list of date/value submissions, filters to the votable Proposed Dates, casts each Vote, and reports whether anything changed. The GET and POST join handlers build that list from their own source (query or body) and call the one operation. A Participant sees exactly the same voting behaviour on both paths.

**Blocked by:** 06 (agreed order)

**Status:** ready-for-agent

- [x] `applyVotes(session, submitted)` owns the votable-date filter, the value whitelist and the changed flag
- [x] Both join vote handlers build the submission list and call it; the duplicated loop is deleted
- [x] The confirmed-session lock (a locked session does not cast) is preserved on both paths
- [x] The pending-vote fallback redirect still carries pending submissions (or the behaviour is explicitly re-scoped in the ticket)
- [x] A unit test covers casting, updating an existing Vote, rejecting a non-votable date and the changed flag
- [ ] Join-voting e2e is unchanged and green
- [ ] `npm run verify` passes

## Comments
