# Review: 01-edit-command-seam

Two-axis review of `86ee2cf...HEAD` (commit `149ff33` "ticket done: 01-edit-command-seam"),
spec source: `.scratch/architecture-deepening/issues/01-edit-command-seam.md`
and `.scratch/architecture-deepening/spec.md` (decision 01).

The `code-review` skill asks for two parallel sub-agents, but this environment has no
Task/sub-agent tool, so both axes were reviewed inline. They are still reported
separately.

## Standards

Documented standards (`AGENTS.md`, the `route-handlers`, `testing`, and `tdd` skills)
are met:

- **Typed, not stringly.** `EditCommand` is a typed interface; `message` and `extras`
  are typed as `Derived<T>` over `Postponement`; the escape hatch is the real
  `Response` type, not a sentinel. No `string`-codes were introduced.
- **Error handling at the trust boundary.** The not-found guard throws via
  `app.notFound`, so the missing-session path is handled once and the seam keeps the
  single localized message (`app.t('session_not_found')`); the two handlers that had
  the hard-coded English string now localize it too.
- **Duplication removed, not added.** Seven copies of `load → guard → save → render`
  collapse into `run-edit-command.ts` (73 lines, 100/100 line and branch coverage
  per `coverage/lcov.info`). `saveWithClashCheck` loses its private `store.save`, and
  the shared `createApp` fake replaces the copy inside `edit-handlers.spec.ts`.
- **Lazy / deletion over addition.** 711 insertions against 472 deletions; no new
  dependency; no new locale strings; `app.c` still the request/response surface
  (ticket 03 owns making it private).
- **Tests not weakened.** The seam spec exercises every pipeline branch directly and
  runs all seven handlers through a `describe.each` matrix; the legacy spec keeps its
  handler-specific add/generator/clash/occupancy coverage. `tsc` (source + e2e) and
  `eslint --max-warnings 0` are green; 706 unit tests pass.
- **Test naming / assert style.** `create-app.ts` carries an explicit return type and
  uses `as unknown as Context` rather than `any` (it is not a `*.spec.ts`, so the
  `no-explicit-any` relaxation does not apply). Assertions use the fixture builders.

Baseline smells checked: no Mysterious Names, no Data Clumps, no Message Chains, no
Middle Man, no Shotgun Surgery. Reference-inequality (`updated !== session`) as the
"changed" signal is the repo's existing idiom (`delete`/`confirm` already used it).

Judgement calls (no documented-standard breach):

- **Duplicated computation (Duplicated Code, minor).** `confirm-date-post.ts` calls
  `confirmedDateHasClashes(updated)` once in `message` and once in `extras`. Both
  read the same immutable updated session, so the result cannot disagree; combining
  them would fight the spec's `message`/`extras` split. Acceptable.
- **Closure-captured mutable outcome (`let extras`/`let message`, `refresh-clashes`
  `let checkResult`/`let hadSnapshot`).** The spec fixes the callback shape as
  `(rules, session) => session`, so add-dates and refresh must surface the fields
  their `message`/`extras` functions read through captured locals. It is indirect
  but contained; an outcome object would deviate from the agreed signature.
- **`as` cast in `resolveDerived`.** The callability narrowing of `T | (…)=>T`
  needs `(value as (updated: Postponement) => T)(updated)`; TS widens the guarded
  member to `T & Function`. One localized cast, commented by its generic signature.
- **`alwaysRender` flag.** Not in the written spec; it exists solely to preserve the
  visibility toggle's existing behaviour (it answers a plain request with the full
  page instead of a redirect). Without it the refactor would silently change an
  observable response, against the strict-refactor guardrail. The comment names the
  one caller, so it is not speculative generality.
- **`__test-utils__/create-app.ts` branch coverage 85.71%** (the `options = {}`
  default is never exercised). Cosmetic: either drop the default (all callers pass an
  object) or add a no-arg call. Repo-wide branch coverage is unchanged at 82.39%.

## Spec

Spec decision 01 asks: `runEditCommand` owns load, not-found guard, save-when-changed
and partial-render-or-redirect; a handler supplies a callback `(rules, session) =>
session`, a `message` that may be a function of the updated session, and optional
render extras; it may return a `Response` as an escape hatch; covers all seven edit
POSTs including add-dates and refresh-clashes.

Implemented as specified:

- **Seam owns the pipeline.** `run-edit-command.ts` holds load, guard,
  `updated !== session` save, and the `isPartial` render-or-redirect.
- **All seven handlers route through it.** reopen, delete, visibility, confirm,
  players, add-dates, refresh-clashes all call `runEditCommand`; the
  `describe.each` matrix in `run-edit-command.spec.ts` drives each one.
- **Confirm clash warning** — `message`/`extras` are functions of the updated
  session and key off `confirmedProposedDateId`, not the query (the legacy
  "judges the warning from `confirmedProposedDateId`" test still passes).
- **Refresh keeps the snapshot and announces "previous results"** — the failed check
  returns the unchanged session; `extras` sets `refreshError` and `message` stays
  undefined, so the OOB status element renders nothing.
- **Add-dates keeps its 400 partials and no-save branches via the escape hatch** —
  validation, over-cap, invalid-row, empty-result and the from/to constraint branches
  return a `Response` from `apply`, bypassing the save; `redirectAfterEdit` and
  `renderPartial` are reused verbatim.
- **Characterization ported and legacy shrunk** — the generic pipeline matrix
  (not-found, save/render with message, non-partial redirect, explicit
  `redirectTo`) moved into `run-edit-command.spec.ts`; `edit-handlers.spec.ts` went
  from 92 to 82 tests and the shared `createApp` fake was extracted.
- **No scope creep in user-visible terms** — no e2e file or screenshot baseline was
  touched, no locale key added, no dependency added.

Deviations / partials worth recording:

- **`alwaysRender` and function-valued `extras` are a superset of the written
  decision.** The spec says only `message` may be a function; `extras` as a function
  is required for confirm's `confirmClashWarning`, and `alwaysRender` is required for
  visibility. Both are behaviour-preserving, not new product behaviour.
- **"shrunk to only non-edit coverage" is read as "shrunk to non-seam coverage".**
  The file still tests edit handlers (players validation, the generator, clash and
  occupancy) because deleting those would drop `proposed-dates-post.ts` coverage
  below the gate. Under a stricter reading, those tests would move to a
  `proposed-dates-post.spec.ts`; this was not done to keep the change reviewable.
- **One characterization assertion changed on purpose.** A failed refresh no longer
  writes the unchanged session (save-when-changed), so the legacy "saves once"
  assertion became "does not write". This is exactly the spec's save-when-changed
  decision, but it is the one place a previously pinned store-write count moved.

## Summary

Standards: 0 hard violations, 5 judgement calls (worst: the closure-captured mutable
outcome in add-dates/refresh, accepted as a consequence of the agreed callback shape).
Spec: decision 01 is implemented for all seven handlers; the noted deviations
(`alwaysRender`, function-valued `extras`) are additive to preserve behaviour, and the
one behavioural change (skip the write for an unchanged refresh) is mandated by the
spec.
