# Review: 03-fallback-intent

Reviewed diff: `7d1f3d0..HEAD` (281d565, 9b88339) against the ticket + spec in `.scratch/ical-vote-links/`.

## Standards

No documented-standard violations found. Tooling (tsc strict, eslint, `explicit-function-return-type`) already enforced.

Judgement calls (no action, recorded only):

- `pendingVotes` on `JoinPageProps` is optional with a `?? []` fallback, though both production callers pass it. Keeping it optional mirrors the existing `error?` prop pattern and future-proofs the confirmed-info rendering path; not worth tightening.
- The join page's inline auto-redirect script preserves `vote-*` keys from `window.location.search` client-side when a stored identity bounces past the register step. This is a client-side echo of arbitrary `vote-*` keys — but the destination `GET /vote` re-validates every `vote-<dateId>` against `rules.votableDates` + the `isVoteType` whitelist before casting (ticket 02), so a crafted key cannot cast an invalid state. The server-side redirects never echo unvalidated strings.
- `readPendingVotes` mirrors the ticket-02 cast loop (iterate `rules.votableDates`, `isVoteType` guard). Sharing the *value* guard (`isVoteType`) is now real (three call sites); sharing the whole loop is not attempted, so there is no divergence risk where it matters.

## Spec

All 4 ticket criteria implemented:

- [x] #1 unknown `playerId` + pending `vote-<dateId>=<value>` redirects to the register step carrying the intent (`handleJoinVoteGet` appends `pendingVoteQuery(readPendingVotes(...))`). Test asserts the choice survives.
- [x] #2 the register POST appends the same pending field to its `/vote` redirect (read from the POST's query, since the register form action now carries it); `GET /vote` casts it on arrival. The full-chain test (unknown-player GET → register POST → vote GET) asserts the Vote lands and the poll shows `value="Yes" checked`.
- [x] #3 a shared/stale file degrades silently: no `playerId`, or a `playerId` matching no Participant, keeps the ticket-01 unpersonalized export and the register redirect — never a 400. The existing "redirects to step 1" test still passes with no pending vote (empty-suffix path).
- [x] #4 the landing poll shows the cast Vote (asserted in the full-chain test).

Tampering surface (spec "Carrying the intent through the register step", ticket "never echo arbitrary query strings"):

- `readPendingVotes` only ever reads `vote-<votableDateId>` for real votable dates and drops any value outside `Yes|IfNecessary|No`; `pendingVoteQuery` URL-encodes the dateId. Tests assert an invalid value (`Maybe`) is not echoed and a closed (non-votable) date's vote is not carried.

Completing the register step also preserves intent on the inline-error re-render (form action keeps the `vote-*` suffix for a retry) and in the stored-identity auto-redirect — both are parts of "carry the intent through the existing register step", not new UI (partial-vs-initial rule untouched: the register form already existed; only its action and the inline script changed).

No scope creep: no locale keys, no ical-builder changes, no vote-view changes, no e2e (ticket 04 owns it), and the ticket-02 casting behaviour in `handleJoinVoteGet` is unchanged (only the `!player` branch gained the intent suffix).

Gates: `npm run lint` green; `npm run test` all pass (40 in join-handlers.spec.ts, 710 total), coverage Statements 90 % / Branches 83 % / Functions 94 % / Lines 91 %.

Verdict: approve, no fixes required.