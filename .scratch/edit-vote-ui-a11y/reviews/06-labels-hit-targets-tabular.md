# Review: 06-labels-hit-targets-tabular

Fixed point: `53d84ba` (parent). Reviewed commits: `4f6db02` (`ticket done: 06-labels-hit-targets-tabular`).

## Standards

No violations.

- The casing change is data-only: `en.json`/`de.json` `vote_if_necessary` values move from `if necessary`/`notfalls` to `If necessary`/`Notfalls`; every render site already reads the key through `t()`, so no view or domain code moves. `postponement.ts`, the vote types, and the stored `IfNecessary` value are untouched, as the spec's "no domain change" rule requires.
- The casing ripple is caught everywhere it reaches a literal expectation: `vote-view.spec.tsx` (set-all aria, intro list order, German intro), `vote-tally.spec.tsx` (header + `data-label`), and `proposed-dates-section.spec.tsx` (dot `aria-label`).
- The numeric fix extends the existing `.num` convention instead of inventing a second one: one selector list `.num, .team-tally, .vote-dot-count` carries `font-variant-numeric: tabular-nums` + `text-align: end`. No duplicated declaration blocks.
- Target-size fix reuses the established "wrapped label is the target" pattern rather than restyling native inputs (`min-width/min-height: 24px` on `.vote-radio-group .radio`, `.sort-option`, `.action--votable`), matching the existing `>=44px` vote-label comment and the repo's WCAG 2.2 target-size prior art (air-datepicker rows).
- The new browser spec (`target-size.spec.js`) follows the browser project's contract (`src/public/assets/js/*.spec.js`, explicit `vitest` imports, globals via the runner) and mirrors the real cascade from `main.tsx` (`layer(vendor)` for beer, then `layer(design)`) instead of importing beer unlayered, which would invert the cascade and shadow the rules under test.
- `expectTabularEnd(selector)` is the one shared assertion shape for both numeric cases — no copy-paste across the two `it`s.

Judgement calls (no change requested):

- `24px` is repeated in three CSS rules rather than promoted to a `--target-size` token. A single-use token would touch the shared `design-tokens.css` (outside this ticket's lane) and the repo already inlines `24px` for the air-datepicker and language-select target-size fixes.
- The browser spec restates the app's layer order from `main.tsx`; that coupling is documented in-file and is the price of measuring the real cascade.
- `text-align: end` on `.team-tally`/`.vote-dot-count` is a visual no-op in their current flex boxes but is applied deliberately to literally satisfy the spec's "end alignment ... extending the existing `.num` convention".

## Spec

Ticket criteria 1–4 map to the implementation + specs:

- Criterion 1 — the middle choice now reads `If necessary` (en) / `Notfalls` (de) from the locale value; the new `test.each` in `vote-view.spec.tsx` asserts the title-cased label sits between the Yes and No radio `<span>`s in both locales and that `value="IfNecessary"` is still emitted. The intro list and the edit-rail dot `aria-label` inherit the same key, covered by the updated existing specs.
- Criterion 2 — the three wrapped-label selectors carry the 24×24 floor; the browser spec measures `getBoundingClientRect()` ≥ 24 for all three vote labels plus `.sort-option` and `.action--votable`. Axe was re-checked against a dense reproduction of the vote and edit-rail markup: with the shipped CSS, with the min-sizes stripped, and worst-case (sizes + padding stripped), the `target-size` rule (run under the project's `wcag22aa` tag set, which does include `target-size`) reported zero violations. The real-server axe pass is the coordinator's e2e gate.
- Criterion 3 — vote-summary cells already carried `.num`; `.team-tally` and `.vote-dot-count` now join it. The browser spec asserts computed `fontVariantNumeric` contains `tabular-nums` and `textAlign` is `right`/`end` on `.num`, `.team-tally`, and `.vote-dot-count`.
- Criterion 4 — `target-size.spec.js` is the browser-level geometry + computed-alignment spec and passes. The existing axe `checkA11y` coverage is unchanged.

### Open item — cross-lane e2e breakage (blocks `npm run e2e`, not fixed here)

The title-cased labels invalidate two **case-sensitive `exact: true`** expectations in the e2e Page Object, which are outside this ticket's file lane:

- `e2e-tests/pages/JoinPage.ts:9` — `IfNecessary: 'if necessary'` is used at line 129 by `group.getByText(VOTE_LABELS[vote], {exact: true})`; `exact` is case-sensitive, so `castVote('IfNecessary')` will no longer find the label.
- `e2e-tests/pages/JoinPage.ts:17` — `IfNecessary: 'Set all: if necessary'` is used at line 138 by `getByRole('button', {name: ..., exact: true})`; same failure for `setAllVotes('IfNecessary')`.
- `e2e-tests/join-voting.e2e.ts:175-176` — the loop asserts `getByRole('button', {name: 'Set all: if necessary', exact: true})`.

Fix: title-case those three literals (`'If necessary'`, `'Set all: If necessary'`). Playwright's default (non-`exact`) name matching is case-insensitive, so the remaining lowercase references (`VOTE_LABELS` at line 78/123, the `join-voting.e2e.ts` comments) still match, but the literals are now stale and should be aligned too. Deferred to the coordinator because e2e files are out of this ticket's lane.

### Not verified here

The real edit-rail/vote-page axe run under the running server (the existing `checkA11y` e2e tests). Out of lane by instruction; the synthetic dense-DOM run above is supporting evidence, not a substitute.
