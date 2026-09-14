# Review: 04-creation-seam

Two-axis review of `d9eb4f7...HEAD` (commit `d181605` "ticket done:
04-creation-seam"), spec source:
`.scratch/architecture-deepening/issues/04-creation-seam.md` and
`.scratch/architecture-deepening/spec.md` (decision 04).

The `code-review` skill asks for two parallel sub-agents, but this environment has no
Task/sub-agent tool, so both axes were reviewed inline. They are still reported
separately.

## Standards

Documented standards (`AGENTS.md`, `CONTEXT.md`, the `testing` and `tdd` skills) are met:

- **Strongly typed, not stringly.** `create` takes one explicit
  `CreatePostponementInput` (required team fields, optional identities/club/date, the
  `AppLocale`, `readonly` player/venue arrays, precomputed hash strings) instead of an
  untyped bag. No `any`, no string codes added.
- **Deletion over addition.** The change is net small (67 insertions against 13
  deletions across `src/`, minus the deleted `timestamp.ts`); the second clock is gone
  and no code references `Timestamp`/`app.timestamp` (`grep` returns only comments).
- **No new dependency, no new locale string, no user-visible change, no e2e file
  touched.** The route's scraping, password generation and hashing are untouched.
- **Tests at the seam, per the `testing` skill.** The new spec subclasses
  `FakePostponementRules` (the established `newId`/`now` override pattern), reuses the
  `aPlayer` builder, and asserts the full entity with `toEqual` (exhaustive Draft
  invariants), plus a focused second test for the club-id override and pass-through
  hashes.
- **Ponytail.** No speculative abstraction: `create` has one caller, the input type is
  the fields the caller already has, the array copies are a one-line defensive
  boundary, and the stale `ponytail:` comment on `now()` was corrected rather than
  left lying. Non-trivial logic leaves its runnable check (the two `create` tests).

Baseline smells checked: no Mysterious Names, Duplicated Code, Feature Envy, Data
Clumps, Primitive Obsession, Repeated Switches, Shotgun Surgery, Divergent Change,
Speculative Generality, Message Chains, Middle Man, or Refused Bequest.

Judgement calls (no documented-standard breach):

- **`clubId` default is applied inside `create`, not the route.** The ticket only says
  `create` owns the Draft invariants and the id/clock seam; `?? DEFAULT_CLUB_ID` is not
  literally a Draft invariant. Moving it into `create` is what lets the route truly
  "stop hand-assembling the session object", so it is in the spirit of the decision,
  but it is a small widening of `create`'s remit.
- **`players`/`venues` are shallow-copied.** The route passes fresh arrays, so the copy
  is redundant today; it guards the returned session against a caller mutating its own
  input array afterwards, consistent with the module's immutable style. Cost is one
  spread.
- **`new PostponementRules()` is instantiated inline in the route**, matching every
  other handler in the repo (edit/join). Fine; the seam under test is `create`, not
  injection.

## Spec

Decision 04 is implemented in full and every acceptance criterion is satisfied:

- **`create(input)` returns a Draft Postponement.** `status: 'Draft'`, `reopenCount:
  0`, `organizerTeam`, empty `proposedDates`/`votes`, and the id/`createdAt` minted
  through `this.newId()`/`this.now()`. Name is derived through
  `derivePostponementName` with the passed locale.
- **The route calls it.** `match-post.ts` still scrapes players/club/venues/identities
  and still generates + hashes both passwords, then hands them (plus the scraped match
  fields) to `create`; the hand-built 20-field object literal is gone.
- **Name derivation moved.** The route no longer calls `derivePostponementName` or
  imports it; `create` does.
- **Second clock deleted.** `src/lib/timestamp.ts` is removed and `App.timestamp` with
  it; `grep` finds no remaining reference, and `createdAt` now flows from `create`
  via `now()`.
- **Unit test.** `postponement.spec.ts > create` constructs through the fake
  id/clock and asserts the Draft invariants (plus a club-id/hash pass-through test).
- **E2E and screenshots unchanged.** No e2e file or baseline touched; `npm run verify`
  ran 118 e2e (incl. `scraping-flow.e2e.ts`) and the screenshot baselines green.
- **`npm run verify` passes** (lint → test → build → e2e).

No scope creep: no new route, locale string, dependency, or user-visible behaviour.

Deviations / partials worth recording:

- **Ticket criterion "Coverage ≥ 90%" is still not met on branches repo-wide
  (82.34%, statements 90.02%, functions 92.94%, lines 90.27%).** Same pre-existing
  caveat as tickets 02/03: the testing skill states the enforced gate is 80%, no
  threshold is configured, and this change adds fully covered seam code (both `create`
  tests) rather than a regression. The ticket's literal 90% on *all* metrics is not
  satisfied.
- **Player ids in the route still come from `generateId()`.** That is the scraping
  path's own id minting for `Player`, outside the Postponement creation seam, and was
  deliberately left untouched.

## Summary

Standards: 0 hard violations, 3 judgement calls (worst: `clubId` default applied inside
`create` — a small, deliberate widening that serves the "route stops hand-assembling"
goal). Spec: decision 04 implemented in full, all seven acceptance criteria ticked; the
only unfulfilled text is the ticket's 90% branch coverage, the same pre-existing
repo-wide figure against an 80% enforced gate.
