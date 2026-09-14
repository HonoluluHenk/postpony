# Review: 06-venue-resolution-module

Two-axis review of `7112508...HEAD` (commit `df05c6d` "ticket done:
06-venue-resolution-module"), spec source:
`.scratch/architecture-deepening/issues/06-venue-resolution-module.md` and
`.scratch/architecture-deepening/spec.md` (decision 06).

The `code-review` skill asks for two parallel sub-agents, but this environment has no
Task/sub-agent tool, so both axes were reviewed inline. They are still reported
separately.

## Standards

Documented standards (`AGENTS.md`, `CONTEXT.md`, the `testing` and `tdd` skills) are met:

- **`lib` stays JSX-free.** `src/lib/venues.ts` is plain `.ts` with no JSX; the component
  moved to `src/routes/partials/venues.tsx`. The layering is preserved: `lib` imports only
  a `import type { Venue }` from `./models`, while `partials` imports the helpers.
- **Strongly typed, not stringly.** `defaultVenueNumber(venueNumber: number | undefined):
  number`, `resolveVenue(venueNumber: number | undefined, venues: readonly Venue[]):
  Venue | undefined`, `venueShortName(...): string | undefined`. No `any`, no stringified
  venue codes.
- **Deletion over addition.** The old module's `findVenue` and iCal's local `resolveVenue`
  are gone; `grep` for `?? 1` in `src/` returns only the one line inside
  `defaultVenueNumber`, and `grep` for `venues.find` returns only `venues.ts`. The rename
  is detected at 63% similarity; net diff is small.
- **No new dependency, no new locale string, no user-visible change, no e2e file or
  screenshot baseline touched.**
- **Tests at the seam, per the `testing`/`tdd` skills.** `venues.spec.ts` is a new
  characterization/behaviour spec at the module interface: the default (absent ⇒ 1, kept
  numbers), the lookup (by number, absent ⇒ 1, no match, and absent with no venue 1), and
  the short name (resolved, missing). The existing `venue-occupancy.spec.ts`,
  `ical.spec.ts` and `vote-view.spec.tsx` render/behaviour tests are untouched and green,
  so the extraction is characterization-backed.
- **Comments match repo style.** The moved helpers keep their JSDoc; the new module has
  one module-level note explaining the rule it centralizes.

Baseline smells checked: no Duplicated Code (this MR removes the last copies), Mysterious
Names, Feature Envy, Repeated Switches, Shotgun Surgery, Divergent Change, Speculative
Generality, Message Chains, or Refused Bequest.

Judgement calls (no documented-standard breach):

- **Accepted — `venueShortName` is a one-line delegate** (`resolveVenue(...)?.shortName`),
  which reads as a possible Middle Man. It is a domain accessor explicitly named in the
  spec's interface (`defaultVenueNumber`, `resolveVenue`, `venueShortName`), and it is the
  call the rail and pill actually want; inlining it would leak the `.shortName` field walk
  into callers. Repo standard (the spec) overrides the baseline heuristic.
- **Accepted — `(venueNumber, venues)` repeats across three signatures**, a faint Data
  Clump. Bundling them into a type would be a new abstraction the spec did not request and
  would push a UI-shaped bag into the domain module; the ponytail rule wins.
- **Accepted — import placement.** `defaultVenueNumber` is inserted after the `models`
  import in `proposed-dates-post.ts`, before `@js-temporal/polyfill`. `eslint --max-warnings
  0` and both `tsc` projects pass, so no documented rule is broken.

## Spec

Decision 06 is implemented in full and every acceptance criterion is satisfied:

- **A JSX-free venue module exposes the default, `resolveVenue` and `venueShortName`.**
  `src/lib/venues.ts` exports exactly those three; `defaultVenueNumber` is the single home
  of `venueNumber ?? 1`.
- **`VenueBadge` and its label/tooltip helpers consolidate into one partials module.**
  `src/routes/partials/venues.tsx` (renamed from `venue-badge.tsx`) now holds
  `venueNumberToken`, `venueTooltip`, `VenueBadge` and `venuePillLabel`, and imports
  `defaultVenueNumber`/`resolveVenue`/`venueShortName` from `lib/venues`. The local
  `findVenue` and the local `venueShortName` are deleted; the only remaining callers
  (`vote.tsx`, `proposed-dates-section.tsx`) import from the new path.
- **Occupancy, iCal, badge, dedup and rail all use the one default.** Occupancy
  (`venue-occupancy.ts`) and generator dedup (`proposed-dates-post.ts`) call
  `defaultVenueNumber`; iCal calls `resolveVenue(date.venueNumber, session.venues)` and its
  private `resolveVenue` is deleted; the badge helpers call
  `resolveVenue`/`defaultVenueNumber`; the rail imports `venueShortName` from `lib/venues`
  and `venueNumberToken` from the partial (which delegates to `defaultVenueNumber`).
- **The duplicated lookup is deleted.** The old `findVenue` (partials) and
  `resolveVenue(session, ...)` (iCal) are both gone; `venues.find` now occurs once.
- **Badge unit tests and the vote-page e2e are green; rendered output is unchanged.**
  `vote-view.spec.tsx` (including the pill/short-name/occupancy assertions) is untouched
  and passes; no assertion was weakened. `npm run test` is 747/747 green; `npm run verify`
  reached 126/126 e2e with no baseline update. The moved functions are byte-for-byte
  equivalent in output, confirmed by the render specs.
- **`npm run verify` passes.** lint (both `tsc` projects + eslint) → 747 tests → build →
  126 e2e, all green.

No scope creep: no new route, locale string, dependency, or user-visible behaviour. The
`venueOptions` dropdowns in `edit.tsx`/`proposed-dates-section.tsx` were correctly left
alone — they list scraped venues and do not encode the "absent ⇒ 1" resolution rule.

Notes / partials worth recording:

- **Ticket line reference off by ~100 lines.** The ticket points the generator dedup at
  `proposed-dates-post.ts` ~line 418; line 418 is the `renderPartial` helper. The actual
  `(pd.venueNumber ?? 1) === (venueNumber ?? 1)` copy is at lines 312–314 and was the one
  replaced. No requirement was missed.
- **Ticket criterion "Coverage ≥ 90%" (from `AGENTS.md`) is still not met on branches
  repo-wide** (statements 90.16%, functions 93.11%, lines 90.51%, branches 82.48%). Same
  pre-existing caveat as tickets 02–05: the `testing` skill states the enforced gate is
  80%, no threshold is configured in `vitest.config.ts`, and this change moves
  already-covered code (new `lib/venues.ts` is 100% on every metric) rather than dropping
  coverage. The ticket's literal 90% on *all* metrics is not satisfied.

## Summary

Standards: 0 hard violations, 0 minor nits, 3 accepted judgement calls (worst: the
`venueShortName` delegate, kept because the spec names it). Spec: decision 06 implemented
in full, all six acceptance criteria ticked; the only unfulfilled text is the ticket's 90%
branch coverage, the same pre-existing repo-wide figure against an 80% enforced gate.
