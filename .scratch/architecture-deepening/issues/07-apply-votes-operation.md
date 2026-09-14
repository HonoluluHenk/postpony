# 07: Apply votes operation

**What to build:** Applying submitted Votes is one domain operation instead of two hand-synced handler loops. `PostponementRules.applyVotes(session, submitted)` takes a pre-built list of date/value submissions, filters to the votable Proposed Dates, casts each Vote, and reports whether anything changed. The GET and POST join handlers build that list from their own source (query or body) and call the one operation. A Participant sees exactly the same voting behaviour on both paths.

**Blocked by:** 06 (agreed order)

**Status:** ready-for-agent

- [x] `applyVotes(session, submitted)` owns the votable-date filter, the value whitelist and the changed flag
- [x] Both join vote handlers build the submission list and call it; the duplicated loop is deleted
- [x] The confirmed-session lock (a locked session does not cast) is preserved on both paths
- [x] The pending-vote fallback redirect still carries pending submissions (or the behaviour is explicitly re-scoped in the ticket)
- [x] A unit test covers casting, updating an existing Vote, rejecting a non-votable date and the changed flag
- [x] Join-voting e2e is unchanged and green
- [x] `npm run verify` passes

## Comments

- `a3bf630` + `bca9232` ticket done, `4ae18a8` review: `PostponementRules.applyVotes(session, participantId, submitted)` owns the votable-date filter, the (`isVoteType`, now domain-owned) value whitelist, one `castVote` per surviving submission and the `changed` flag; both join vote handlers build their submission list from query/body and the duplicated loop is deleted, with behaviour, the Confirmed lock, the GET `updated`/POST `canVote` rendering and the pending-vote fallback redirect all preserved. `readPendingVotes` reshaped to a pure lookup reader. No fixes needed; `npm run verify` green (754 tests, 126 e2e).
