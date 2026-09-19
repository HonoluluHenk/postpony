# Review: 05-vote-page-week-grouping

## Standards

No violations.

- The week grouping reuses the edit rail's `groupByWeek` + `RailGroupHeading`
  (label + `week-range`) instead of reimplementing ISO-week logic; `RailGroupHeading`
  gains an optional `trailing` element, so the vote page hoists the chip without
  duplicating the heading markup and existing rail callers are untouched.
- `occupancyClause` is extracted once and used by both the hoisted chip and the
  per-date legend chips — no duplicated count-interpolation branch.
- `VotePageDate` grows `dateTimeRange: {start}` (populated in `vote-view.tsx`) so it
  satisfies the shared `DateSortableRow` type; legacy dates without a venue number
  resolve to venue 1 via `defaultVenueNumber` (matches how `venues.tsx` resolves).
- Locale keys are reused, not re-typed: `week_label` comes through `groupByWeek`,
  `venue_legend_occupancy*` is consumed by the chips. No `en.json`/`de.json` change.
- Each `<section class="vote-week">` carries the `week-head` `<h3>` as first child
  (repo section rule); `vote-region` stays a `<div>`, so the tally `<section>` is a
  sibling, not a nested section.
- Spec additions follow the existing `vote-view.spec.tsx` conventions (builders,
  `createApp`, `renderVoteStep`, `toContain` on the rendered body); the two existing
  tests that anchored pills on `</legend>` were re-anchored on the heading.

Judgement calls (no change requested): the `.vote-week` class currently has no CSS
rule — it is a semantic/structural hook for the grouping sections (analogous to
`.vote-radio-group`) and ready for the companion styling tickets; the mobile flex
behaviour of a three-item `week-head` (label / range / chip via `space-between`) is
not specified by the spec and left to the styling tickets.

## Spec

Ticket criteria 1–4 are implemented and covered by the render spec:

- Criterion 1 — `groupByWeek` splits at real week boundaries; tests cover two dates
  in one week group (single heading, ISO range) and dates on either side of a
  boundary (two headings). Grouping does not change the votable rows.
- Criterion 2 — same-venue groups render the chip once in the group heading and the
  legends drop it; the visually-hidden full venue name still reaches assistive tech.
  Legacy dates resolve to venue 1, so a mixed (1)/(2) group keeps both legends.
- Criterion 3 — mixed-venue groups keep a chip per legend (covered in the venue-pill
  and de-CH occupancy tests).
- Criterion 4 — the summary and the form/save path are untouched; the whole suite
  (1116 tests) passes and `vote.tsx` coverage stays ≥ 90%.

Criterion 5 (join e2e showing the grouped headings and the once-per-group chip) is
coordinator-delegated. Flag for the coordinator: `e2e-tests/join-voting.e2e.ts`
lines 183-186 assert the full venue name on the per-date radio GROUP legend
(`getByRole('group', {name: /Turnhalle orange, UG, Schule Dennigkofen/})`); with the
chip hoisted the legend is now date-only, so that anchor will break. The e2e should
target the level-3 week heading (e.g. `getByRole('heading', {level: 3, name: /Week/})`
or the week-range text) and assert the venue chip appears once per homogeneous group,
which also satisfies the spec's "week headings are visible" e2e decision.

No fixes required.