# Review: 03-own-team-votes-stack-on-phone

Fixed point: `348fa9a` (chore: comments for 02-date-card-visible-all-widths)
Commit reviewed: `5be4275` ticket done: 03-own-team-votes-stack-on-phone

## Standards

No hard violations. Reviewed against AGENTS.md, the `testing` skill (a11y
selectors, `setViewport`, `checkA11y`, observable-behaviour assertions, fixture
builders), the `route-handlers`/`htmx` skills (initial-template vs partial
rendering), and the code-review smell baseline.

- Markup: the two added `data-label` attributes mirror the existing
  `vote-tally.tsx` pattern exactly — `<td data-label={props.t('voted_column')} class="num">`
  matches the home/away tallies' `<td data-label={...} class="num">` order, and
  the player vote cells carry `cell.playerName` (index-aligned with the
  `organizerPlayers` column headers, since both come from the same
  `players.filter(p => p.teamId === organizerTeam)` sequence). No hardcoded
  strings; the labels reuse the locale keys (`voted_column`) or the roster name.
- Unit spec: the two updated assertions and the new dedicated data-label test
  follow the existing `renderToString` + `toContain` style. The label strings
  assert exact rendered markup, consistent with the other assertions in the file.
- e2e: the new test reuses `setViewport`, `EditPage.createSession`,
  `expectFullyInViewport`, `checkA11y`, and `getByRole` selectors. The
  `page.goto(session.editUrl)` reload is justified by a comment: the own-team
  section is part of the full-page template, not the add-date partial, so its
  out-of-band swap needs an existing `#own-team-votes` node. The
  no-horizontal-overflow guard is an observable-behaviour assertion (not a CSS
  property value), consistent with the "tests never assert CSS property values"
  rule.
- No smell baseline matches: no mysterious names, no speculative generality, no
  Feature Envy, no Data Clumps, no primitive obsession. The change is one
  concern (stack the own-team table), so no shotgun surgery.

Judgement call (not a violation): the no-horizontal-overflow
`expect.poll(... scrollWidth <= innerWidth)` duplicates the existing phone test
at `responsive.e2e.ts:63`. Two lines, already an established pattern in the same
file; extracting a shared helper would be YAGNI.

## Spec

Faithful to ticket 03 and the Phase 1 Implementation Decision ("The own-team
Votes table gains per-cell data labels so that the existing stacked-table pattern
for narrow screens applies to it"). All five acceptance criteria implemented and
`npm run verify` passes:

1. Body cells carry data labels matching their column header — player vote cells
   (`data-label={cell.playerName}`) and the voted-count cell
   (`data-label={props.t('voted_column')}`), so `table:has(td[data-label])` now
   matches and the stacked pattern applies.
2. Unit render spec asserts data labels — dedicated test plus the two updated
   assertions.
3. e2e at phone: the "voted" cell of the first row has a bounding box fully
   inside the viewport (`expectFullyInViewport`), with the no-horizontal-overflow
   guard ensuring `scrollIntoViewIfNeeded` cannot mask a pre-fix cut-off column.
4. Desktop table rendering unchanged — the `data-label` attributes are inert
   above the `max-width: 992px` media query; all four `postponement-editing`
   screenshot baselines passed without regeneration.
5. `npm run verify` passes (lint, test, build, e2e — 105 passed).

Judgement call (not a violation): the non-voter detail row
(`<td colspan={votes.length + 2}>`) carries no `data-label`. It spans all columns
and has no single matching column header, so the "matching its column header"
wording does not apply; in the stacked card it reads as a self-labelled detail
line ("Not voted yet: …"), which is the desired outcome. Column-aligned cells —
the ones the stacking pattern needs — all carry labels. No scope creep: the diff
touches only the own-team markup, its spec, the responsive e2e spec, and the
ticket file.

## Summary

Standards: 0 findings (1 non-issue judgement call). Spec: 0 findings (1 non-issue
judgement call). No fixes needed; no `review-fixed` commit.
