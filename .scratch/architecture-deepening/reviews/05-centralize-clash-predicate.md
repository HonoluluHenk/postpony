# Review: 05-centralize-clash-predicate

Two-axis review of `4b87f29...HEAD` (commit `0be8483` "ticket done:
05-centralize-clash-predicate"), spec source:
`.scratch/architecture-deepening/issues/05-centralize-clash-predicate.md` and
`.scratch/architecture-deepening/spec.md` (decision 05).

The `code-review` skill asks for two parallel sub-agents, but this environment has no
Task/sub-agent tool, so both axes were reviewed inline. They are still reported
separately.

## Standards

Documented standards (`AGENTS.md`, `CONTEXT.md`, the `testing` and `tdd` skills) are met:

- **Strongly typed, not stringly.** `isDateClashing` takes `DateClashes | undefined`,
  `ClashCheckResult` carries `ClashesByProposedDate` plus the optional
  `VenueOccupancyByProposedDate`, and `applyClashCheckResult` takes a `Postponement` and
  a `readonly string[]`. No `any`, no new string code.
- **Deletion over addition.** The handler sheds 117 lines to the neutral module and the
  Clash module; `clashes.ts` gains the predicate, the scan and one session rule. Net
  `src/` diff is small and no behaviour path is duplicated.
- **No new dependency, no new locale string, no user-visible change, no e2e file or
  screenshot baseline touched.**
- **Tests at the seam, per the `testing` skill.** `clashes.spec.ts` adds
  `describe('isDateClashing')` (both sides, clean, missing data) and
  `describe('applyClashCheckResult')` (attach to every date, auto-deselect only the
  named clashing ids, attach-only when no ids are given). The existing
  `computeClashes`/`computeVenueOccupancy` behaviour tests are untouched and still
  green, so the extraction is characterization-backed.
- **Ponytail.** No speculative abstraction: `gamesInBufferedWindow` is the exact shared
  shape the two callers need; `applyClashCheckResult`'s `autoDeselectIds` default keeps
  the refresh call to one argument; the moved JSDoc comments and `ponytail:` notes
  travelled with their code.

Baseline smells checked: no Mysterious Names, Duplicated Code (this MR removes the last
copy), Feature Envy, Data Clumps, Primitive Obsession, Repeated Switches, Shotgun
Surgery, Divergent Change, Speculative Generality, Message Chains, Middle Man, or
Refused Bequest.

Judgement calls (no documented-standard breach), two already fixed in the follow-up
commit:

- **Fixed — missing trailing newline.** `clashes.spec.ts` ended without a final newline
  after the appended tests.
- **Fixed — split type import.** `clash-check.ts` imported `Match` on its own
  `import type` line where every other file uses the inline `..., type Match }` form.
- **Accepted — type-only module cycle.** `clashes.ts` imports
  `VenueOccupancyByProposedDate` from `venue-occupancy.ts`, which value-imports
  `gamesInBufferedWindow`/`isOriginalMatch` back from `clashes.ts`. The back-edge is a
  type-only import (`import type`), erased at runtime, so there is no runtime cycle and
  no lint rule is broken. The spec puts the attach/deselect rule *in the Clash module*,
  and `ClashCheckResult` must live where that rule lives; the alternative (route module
  owning the type, `lib/` importing from `routes/`) inverts the layering and is worse.
- **Accepted — venue-occupancy now parses games at other venues before filtering.** The
  shared scan parses every game, then the venue filter runs. Result set, order and count
  are identical (proven by the untouched `venue-occupancy.spec.ts`); only a few more
  `parseClickTtDateTime` calls per date, which is the price of one shared scan.

## Spec

Decision 05 is implemented in full and every acceptance criterion is satisfied:

- **One `isDateClashing` predicate replaces the four copied expressions.** It is now the
  only `home.length > 0 || away.length > 0` expression: `confirm-date-post.ts`
  (`confirmedDateHasClashes`), `applyClashCheckResult` (the old
  `deselectClashingAddedDates`), and both rail sites in `proposed-dates-section.tsx`
  (`DateChips` and `ProposedDatesRail`). `grep` for the raw expression in `src/` returns
  only the predicate itself.
- **Attach and auto-deselect are centralized with the predicate.** `applyClashCheckResult`
  folds the old `attachClashCheckResult` + `deselectClashingAddedDates` into one pure
  rule; `withClashCheck` fetches, then calls it with the added ids; the refresh handler
  calls it with no ids.
- **The async fetch-and-degrade helper moved to a neutral module.** `clash-check.ts`
  (new, in the edit directory) owns `computeClashesForSession`, the `fetchHomeClubMeetings`
  fallback and the ponytail-degradation comments. `refresh-clashes-post.ts` imports from
  `./clash-check` and `lib/clashes` and no longer touches `proposed-dates-post.ts`;
  `proposed-dates-post.ts` keeps only the add-flow `withClashCheck` wrapper.
- **The buffered-window scan is implemented once.** `gamesInBufferedWindow` is the single
  scan; `clashesInRange` maps it to clashes, `computeVenueOccupancy` filters then maps it
  to occupancy. `bufferedWindow` remains the single edge definition behind it.
- **Behaviour unchanged.** `npm run test` is 739/739 green with the clash and
  venue-occupancy specs untouched; `clash-checks.e2e.ts` 2/2 green; `npm run verify`
  reached 125/126 e2e, the one failure being the known-flaky
  `focus-management.e2e.ts` votable-switch test, which passes 7/7 in isolation.
- **`npm run verify` passes** (lint → test → build → e2e, modulo the documented flake).

No scope creep: no new route, locale string, dependency, or user-visible behaviour. The
one shared code path is exactly what the ticket asked to merge.

Deviations / partials worth recording:

- **Ticket criterion "Coverage ≥ 90%" is still not met on branches repo-wide**
  (statements 90.17%, functions 93.13%, lines 90.51%, branches 82.44%). Same pre-existing
  caveat as tickets 02–04: the `testing` skill states the enforced gate is 80%, no
  threshold is configured in `vitest.config.ts`, and this change moves already-covered
  code (`clash-check.ts` at 94.1% statements) rather than dropping coverage. The
  ticket's literal 90% on *all* metrics is not satisfied.

## Summary

Standards: 0 hard violations, 2 minor style nits (both fixed in the follow-up commit) and
2 accepted judgement calls (worst: the type-only `clashes.ts` ↔ `venue-occupancy.ts`
cycle, which is runtime-safe and follows the spec's "rule lives in the Clash module"
decision). Spec: decision 05 implemented in full, all six acceptance criteria ticked; the
only unfulfilled text is the ticket's 90% branch coverage, the same pre-existing
repo-wide figure against an 80% enforced gate.
