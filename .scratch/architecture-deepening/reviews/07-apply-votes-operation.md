# Review: 07-apply-votes-operation

Two-axis review of `041ac52...HEAD` (commits `a3bf630`, `bca9232` "ticket done:
07-apply-votes-operation"), spec source:
`.scratch/architecture-deepening/issues/07-apply-votes-operation.md` and
`.scratch/architecture-deepening/spec.md` (decision 07).

The `code-review` skill asks for two parallel sub-agents, but this environment has no
Task/sub-agent tool, so both axes were reviewed inline. They are still reported
separately.

## Standards

Documented standards (`AGENTS.md`, `CONTEXT.md`, the `testing`, `tdd` and `route-handlers`
skills) are met:

- **Domain owns the rule, not the route.** `isVoteType` moves from
  `src/routes/join/join-utils.ts` into `src/lib/postponement.ts` and is exported; the
  value whitelist now has one home, and both `applyVotes` and the pending-vote reader
  import it. This is the intended direction: the domain module owns the rule, the route
  consumes it.
- **Strongly typed, not stringly.** `VoteSubmission { dateId: string; value: unknown }`
  keeps the unvalidated request value as `unknown` until the type guard narrows it; no
  `any`, no stringly status. The method returns `{session: Postponement; changed: boolean}`.
- **No new dependency, no new locale string, no user-visible change, no e2e file or
  screenshot baseline touched.** `git diff --stat` touches only the domain module, its
  spec, and the join route files.
- **Deletion over addition.** Both hand-written `for (const pd of rules.votableDates(...))`
  loops are gone; each handler now maps `session.proposedDates` to a submission list and
  makes one call. Net: one operation, two thin call sites.
- **Tests at the seam, per the `testing`/`tdd` skills.** The new `applyVotes` describe
  block targets the operation's interface (not rendered HTML): casting, updating an
  existing Vote, rejecting a non-votable date, rejecting an out-of-domain value, the
  `changed` flag both true and false, and input non-mutation. Fixture builders
  (`aSession`/`aProposedDate`/`aVote`) are used throughout; `toMatchObject` is used for
  model arrays per the skill. No assertion was weakened, skipped, or disabled; the
  existing `join-handlers.spec.ts` failure matrix is untouched and green.
- **Comments match repo style.** The `applyVotes` JSDoc states what it owns and records
  the deliberate `changed` semantics ("a re-cast of the same value still counts").

Baseline smells checked: no Duplicated Code (this change is the dedup), Feature Envy,
Data Clumps, Primitive Obsession, Repeated Switches, Shotgun Surgery, Divergent Change,
Speculative Generality, Message Chains, Middle Man, or Refused Bequest.

Judgement calls (no documented-standard breach):

- **Accepted — `changed` is a mildly Mysterious Name.** It is `true` when a submission
  survives the filters even if it re-writes the identical value, so it means "a Vote was
  applied", not "the value differed". The JSDoc says so explicitly, and the name is fixed
  by the spec's return shape (`{session, changed}`); renaming would diverge from the agreed
  interface. Repo/spec standard overrides the baseline heuristic.
- **Accepted — `readPendingVotes` still walks `votableDates` + `isVoteType` itself**
  alongside `applyVotes`. It is a *reader* that returns `PendingVote[]`, not an applier;
  forcing it through `applyVotes` would mean casting to read. It now shares the whitelist
  via `isVoteType`, so the rule itself is not duplicated.
- **Accepted — the submission-list map repeats in GET and POST.** The two sources differ
  (`app.query(...)` vs `await app.body()`), which is exactly the split the ticket asked
  for ("build the submission list from their own source"); extracting a shared builder
  would need a source-type branch and buy little.
- **Accepted — `app.query.bind(app)` at three call sites.** Passing the method as a
  lookup makes `readPendingVotes` a pure reader (explicitly permitted by the ticket) and
  keeps it out of `App`; a closure at each site would be more noise for no gain.

## Spec

Decision 07 is implemented and every acceptance criterion is ticked:

- **`applyVotes` owns the votable-date filter, the value whitelist and the changed flag.**
  `applyVotes` builds `votableIds` from `this.votableDates(session)`, skips submissions
  whose `dateId` is not in it or whose `value` fails `isVoteType`, calls `castVote` per
  survivor, and returns `changed = any survivor`.
- **Both join vote handlers build the submission list and call it; the duplicated loop is
  deleted.** `join-vote-get.ts` maps `session.proposedDates` to `{dateId, value:
  app.query(...)}`; `join-vote-post.ts` maps the same to `{dateId, value: body[...]}`.
  Both call `new PostponementRules().applyVotes(...)`. The `for` loops and the
  `isVoteType` import are gone from both handlers.
- **The confirmed-session lock is preserved on both paths.** Both handlers keep
  `const canVote = session.status !== 'Confirmed'` and only call `applyVotes` inside
  `if (canVote)`; the GET renders the confirmed-info view and the POST re-renders it. The
  existing `does not cast on a Confirmed postponement` (GET) and `does not change votes
  when the session is confirmed` (POST) tests stay green.
- **The pending-vote fallback redirect still carries pending submissions.**
  `readPendingVotes` was reshaped to a pure lookup reader (permitted), `pendingVoteQuery`
  is unchanged, and all three call sites (`join-get`, `join-register-post`,
  `join-vote-get`) now pass `app.query.bind(app)`. The full-chain test (`unknown player GET
  -> register POST -> vote GET casts the Vote on arrival`) and the `does not carry votes
  for closed dates through the fallback redirect` test stay green.
- **The GET `updated` flag semantics are preserved.** Old GET set `cast = true` for any
  valid queried value; new GET sets `cast = applied.changed`, and `changed` is true for
  any applied submission (including an identical re-cast). POST keeps `updated: canVote`.
- **A unit test covers casting, updating an existing Vote, rejecting a non-votable date
  and the changed flag.** All four, plus the out-of-domain value and non-mutation cases,
  are in `postponement.spec.ts`.
- **Join-voting e2e is unchanged and green; `npm run verify` passes.** No e2e file or
  snapshot was touched; `npm run verify` exits 0 with 126/126 e2e and 754/754 unit/browser
  tests.

The one deviation from the literal spec text:

- **`applyVotes` takes a third parameter, `participantId`.** The spec writes
  `applyVotes(session, submitted: readonly {dateId, value}[]) → {session, changed}`. That
  signature cannot call `castVote(session, proposedDateId, participantId, type)` because
  neither `submitted` nor the parameter list carries the participant. The chosen signature
  is `applyVotes(session, participantId, submitted)`: it keeps the `{dateId, value}`
  submission item exactly as specified and adds the one scalar the operation needs, rather
  than widening every submission item to repeat the same id. Behaviour and the return
  shape match the spec; only the parameter list gains `participantId`. This is a
  deliberate, forced resolution of an under-specified signature, not an unrequested
  feature.

No scope creep: no new route, locale string, dependency, or user-visible behaviour. The
`readPendingVotes`/`pendingVoteQuery` reshape was explicitly permitted by the ticket.

## Summary

Standards: 0 hard violations, 0 minor nits, 4 accepted judgement calls (worst: the
`changed` name, kept because the spec fixes it and the JSDoc disambiguates). Spec:
decision 07 implemented; all seven acceptance criteria ticked; the only deviation is the
forced `participantId` parameter the spec's two-argument signature omits, documented above.
