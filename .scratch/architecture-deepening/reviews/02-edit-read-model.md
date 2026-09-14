# Review: 02-edit-read-model

Two-axis review of `5fc8115...HEAD` (commits `be9e63d`, `a53e87e`
"ticket done: 02-edit-read-model"), spec source:
`.scratch/architecture-deepening/issues/02-edit-read-model.md` and
`.scratch/architecture-deepening/spec.md` (decision 02).

The `code-review` skill asks for two parallel sub-agents, but this environment has no
Task/sub-agent tool, so both axes were reviewed inline. They are still reported
separately.

## Standards

Documented standards (`AGENTS.md`, `CONTEXT.md`, the `route-handlers`, `testing`, and
`tdd` skills) are met:

- **Typed, not stringly.** `EditPartialsData` is the typed builder output;
  `EditPartialExtras` is derived, not hand-listed; `DateSort` is a union, not a string.
  No `string`-codes were introduced.
- **Strongly typed, one declaration.** The session-derived display fields
  (`sessionId`, `status`, `reopenCount`, `organizerTeam`, `homeTeam`, `guestTeam`,
  `sort`) live once on `EditPartialsData`; `EditGridProps` extends it and
  `EditPageProps` extends `EditGridProps`, so the duplicate `proposedDateTime` and the
  triple re-declaration are gone. `tsc` (source + e2e) and `eslint --max-warnings 0`
  are green.
- **Deletion over addition.** 52 insertions against 90 deletions; `renderEditPartials`
  drops ~23 lines of field-by-field copy for one spread; no new dependency, no new
  locale string, no new file.
- **Behaviour preserved.** The rail's `groupByWeek`/`groupByAvailability`/`sortedRows`
  and the chip/action components are untouched; the only non-mechanical view change is
  `props.sort ?? 'date'` → `props.sort`, required now that the builder always returns a
  sort. E2E (118/118) and screenshot baselines are unchanged and green.
- **`globalError` stays page-level.** `EditPartialExtras` intersects
  `Pick<EditPageProps, 'globalError'>`, so the one page-only extra survives without
  promoting `globalError` into the grid interface.
- **Tests.** `buildEditPartialsData` is the seam the render specs already spread; the
  specs only lost the now-redundant literals (TS2783), assertions otherwise intact.

Baseline smells checked: no Mysterious Names, Data Clumps, Feature Envy, Message
Chains, Middle Man, Refused Bequest, or Shotgun Surgery.

Judgement calls (no documented-standard breach):

- **Hardcoded view-field list (`EditViewField = 't' | 'locale' | 'inputFormat' |
  'baseUrl'`, Divergent Change, minor).** `EditPartialExtras` excludes the view fields
  by naming them. A future `ViewContext` field added to `EditGridProps` would silently
  become an allowed extra unless this list is also edited — two places to change.
  Fixable by excluding `keyof ViewContext` instead, which stays compiler-checked.
- **`Pick<…, Exclude<keyof …>>` indirection.** Less direct than an explicit
  `Pick<EditGridProps, 'proposedDateTime' | 'error' | …>` list, but that list is
  exactly what criterion 5 removes ("adding a hypothetical new error field requires
  editing one declaration"). The doc comment names the intent; accepted.
- **`EditPartialsData` now carries scalar session fields.** The name reads "partials
  data", not "partials + session scalars"; the doc comment was updated to say so.
  Renaming the type would churn every consumer for no behaviour, so kept.

## Spec

Decision 02 is props-only: `EditGridProps` stays the single declaration;
`EditPageProps` extends it (drop the duplicate `proposedDateTime`); `EditPartialExtras`
derives from `EditGridProps`; the session-derived fields move into
`buildEditPartialsData` so `renderEditPartials` becomes one spread; the rail's ISO-week
grouping and availability sort stay in the view.

Implemented as specified:

- **Single declaration.** `EditPageProps` keeps only `title`, `session`,
  `organizerPassword`, `proposedDateTimeDisplay`, `globalError`; the duplicate
  `proposedDateTime` (now inherited from `EditGridProps`) is deleted.
- **Compiler-checked extras.** `EditPartialExtras` is derived from `EditGridProps` by
  `Pick`+`Exclude`. Adding an error field to `EditGridProps` flows into the allowed
  extra set and into `renderEditPartials`' single `...extra` spread with no second
  edit (criterion 5).
- **Builder owns the session fields.** `buildEditPartialsData` returns `sessionId`,
  `status`, `reopenCount`, `organizerTeam`, `homeTeam`, `guestTeam` and the `sort`
  input; `renderEditPartials` is `{...app.view, ...data, ...extra, session, title}`
  with no hand-written field copy. `handleEditGet` also spreads the builder and stops
  re-listing the same fields.
- **Rail untouched.** `groupByWeek`, `groupByAvailability`, `sortedRows`, `DateChips`,
  `DateActions` and the chip/action state are byte-identical.
- **No user-visible change.** No locale key, route, or dependency added; E2E and
  screenshots unchanged; `npm run verify` green (118 e2e passed).

Deviations / partials worth recording:

- **Criterion 6 says "Edit render specs are unchanged", but two spec files changed.**
  Both changes are type-mechanical: `edit-page.spec.tsx` and
  `proposed-dates-section.spec.tsx` had `sessionId`/`status`/`reopenCount`/
  `organizerTeam` written literally *and* spread from the builder, which the compiler
  now rejects (TS2783 "specified more than once"). Removing those four literals is
  unavoidable once the builder owns the fields.
- **One assertion genuinely changed.** `edit-page.spec.tsx` expected
  `Away Team: 0 (0/0/0)`, the translation fallback for an omitted `guestTeam`. The
  spec's `buildSession` sets `guestTeam: 'Guest Team'` and the real `handleEditGet`
  always passed `session.guestTeam`, so the page has always rendered `Guest Team`; the
  assertion now expects that. The fallback path is still covered by
  `proposed-dates-section.spec.tsx`'s explicit-team-name test. So the change corrects
  a spec artefact rather than changing behaviour, but it is not literally "unchanged".

## Summary

Standards: 0 hard violations, 3 judgement calls (worst: the hardcoded `EditViewField`
list, which has a clean compiler-checked replacement). Spec: decision 02 is implemented
in full; the only deviation from the ticket text is criterion 6's "specs unchanged",
forced by the builder now owning fields the specs used to duplicate (plus one fallback
assertion corrected to match the page's actual output).
