# Review: 02-get-vote-casting

Reviewed diff: `440aebb..HEAD` (0ac878d) against the ticket + spec in `.scratch/ical-vote-links/`.

## Standards

No documented-standard violations found. Tooling (tsc, eslint) already enforced.

Judgement calls (no action, recorded only):

- The GET handler now mirrors the POST handler's casting loop (iterate `rules.votableDates`, `isVoteType` guard, `castVote`). The loop shapes are the same but their value sources differ (query vs parsed body) and there are only two call sites; a shared helper is speculative until a third source appears.
- `updated: cast` shows the existing "votes saved" toast on a successful GET cast. The spec calls the re-vote "silent" in the sense of "no confirmation page / no re-identification" (castVote upserts), not "no feedback"; consistent with the POST path, which always toasts.

## Spec

All 5 ticket criteria implemented:

- [x] #1 GET with `vote-<dateId>=Yes|IfNecessary|No` casts via `rules.castVote`, saves, renders the poll; ponytail comment names the GET-state-change trade-off (idempotent upsert, token-gated, Confirmed short-circuit).
- [x] #2 re-click with a different value updates the existing Vote via `castVote` upsert, no confirmation page (test asserts the overwrite).
- [x] #3 out-of-domain values ignored via shared `isVoteType` guard (test asserts `Maybe` is dropped), matching the form submission; closed (non-votable) dates also ignored via iterating `rules.votableDates` only.
- [x] #4 guards unchanged and now covered on the vote route: missing session 404, missing/wrong token 403, invalid team 400.
- [x] #5 Confirmed session never casts (`canVote` gate) and renders the confirmed-info view (test asserts no vote change + "Voting is closed").

No scope creep: `playerId`-unknown redirect is untouched (ticket 03 owns intent preservation); no vote-view / ical / locale changes. The only extra line beyond the ticket is extracting `isVoteType` to `join-utils.ts` so the GET and POST vote paths share the value-domain guard and cannot drift apart.

Gates: `npm run lint` green, `npm run test` all pass (33 in join-handlers.spec.ts, 693 total), coverage Statements 90 % / Branches 82 % / Functions 93 % / Lines 90 % (join-vote-get.ts 100 % stmts / 91.66 % branches).

Verdict: approve, no fixes required.