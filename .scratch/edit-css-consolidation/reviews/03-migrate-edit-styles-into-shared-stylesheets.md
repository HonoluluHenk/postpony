# Code review: 03-migrate-edit-styles-into-shared-stylesheets

Fixed point: `3a8df82` (`git diff 3a8df82...HEAD`).
Commits under review: `6e4e783 ticket done: 03-migrate-edit-styles-into-shared-stylesheets`.
Spec: `.scratch/edit-css-consolidation/spec.md`. Ticket: `.scratch/edit-css-consolidation/issues/03-migrate-edit-styles-into-shared-stylesheets.md`.
Standards sources: `AGENTS.md`, `.agents/skills/css-styling/SKILL.md`, ADRs 0004/0005/0019, plus the Fowler smell baseline.

(Sub-agents unavailable in this environment; both axes were reviewed directly.)

## Standards

- **No hard violations.** The change is a pure move + tokenise: the six `@font-face` rules sit above `@layer design`; the edit section is appended at the *end* of the existing `@layer design` block in `style.css`, which preserves the previous cascade order (former `edit-redesign.css` was linked after `style.css`, both in `design`). `css-styling` convention 4 ("new selectors go in `style.css` inside the existing `@layer design` block") and convention 2 ("token, not literal") are honoured.
- **Scoping correct (ticket requirement).** `.redesign-headline` / `.redesign-headline-sep` stay unscoped (they render in the shared Layout `h1`); every other migrated selector stays under `.edit-redesign`. No rule leaks to another page.
- **Token usage complete within the requested categories.** Spacing/font-size/radius/colour literals are gone from the migrated rules; only these remain, none of which has a token in the ticket-02 catalog and none of which is spacing/type-size/radius/colour:
  - `.vote-dot { width/height: 0.85rem }` — element dimensions, not spacing.
  - `border: 1.5px` on `.vote-dot` and `1px` borders elsewhere — border widths (the ticket explicitly excepts 1px borders; 1.5px has no token).
  - `letter-spacing: ±0.01em`, unitless `line-height: 1.5`/`1.15`, numeric `font-weight` — ratios/keys, no tokens exist and the spec's catalog deliberately adds none.
  - `background: transparent`, `padding/margin: 0`, `border: 0` — CSS keywords/zero resets, not hardcodable values.
  This is consistent with the ticket's out-of-scope note ("tokenizing pre-existing literal values … beyond dead-code removal"), so these are judgement calls at most, not breaches.
- **`--chip-*-fg` use is correct, not scope creep.** The migrated `.chip--clean/--warn/--error` reference both the fg and bg chip tokens from ticket 02. Ticket 04 ("only the two token values change") depends on the warning selector consuming `--chip-warn-fg`/`--chip-warn-bg`; hardcoding `var(--warning)` would have broken that seam.
- **Smell baseline:** Duplicated Code — the repeated `background: var(--surface-container-lowest)` and the shared `border/padding/radius` across `.edit-votes details`, `.side-block`, `.date-actions .action` is a token reuse, not duplicated logic, and the markup is deliberately unchanged (out of scope). No other smell applies: declarative CSS with no control flow, no new abstraction, no delegation.

## Spec

- **Prototype file gone and unlinked; rules + `@font-face` absorbed.** `edit-redesign.css` deleted (451 lines), `<link>` removed from `main.tsx`, six `@font-face` above the layer block in `style.css`, live rules in a commented edit-page section inside `@layer design`. ✔
- **No literal spacing/font-size/radius/colour remains** beyond the excepted 1px borders and the non-category ratios/dimensions above. White surfaces (`chip`, `edit-votes details`, `action`, `action--outline`, `side-block`, `copy-btn`) all use BeerCSS `--surface-container-lowest` (`#ffffff` in `body.light`), byte-identical to the old `#fff`. ✔
- **Breakpoints unified to `993px`/`992px`**, matching `style.css`'s table-stack query; the 599px phone query is untouched. Spot-check: at 993–1023px the grid is now two-column (was stacked below 1024px) — the intended unification; committed 1280px/1282px desktop baselines and the 1024px focus test are unaffected. ✔
- **Token snap drift is within budget.** Largest type shift 0.8rem→sm (0.85, +0.8px) on `.date-day`/`.team-tallies`; largest spacing shift 0.05rem (0.8px) on the 0.3/0.55/0.7/0.9/0.15rem values. Full-page render grew exactly 1px tall, consistent with cumulative drift. The 0.8rem→`--font-size-sm` choice is a genuine tie (equidistant from xs/sm) and is the only judgement call; the visual review below confirms no layout change. ✔
- **Baselines.** Only the four `e2e-tests/postponement-editing.e2e.ts-snapshots/edit-*.png` changed; `git diff --name-only` shows no other `*.png`. Side-by-side review (old vs regenerated) shows the same design — same columns, chips, dots, sidebar, colours — with only 1px vertical drift; the visible password/date-input deltas are pre-existing non-deterministic test data, not CSS. ✔
- **Gate.** `npm run lint` clean; `npm run test` 686/686; `npm run e2e` 118/118. ✔
- **Spec text:** "Chip colours: … chip tints become semantic tokens preserving current values in the first pass (`--chip-clean-bg`, `--chip-warn-bg`, `--chip-error-bg`)" — the fg tokens are the same first-pass preservation and are consumed here; no value changed, so the warning chip keeps its current amber until ticket 04. ✔

Summary: Standards 0 hard violations / 0 actionable judgement calls (4 documented non-category literals); Spec complete, no missing or wrong requirements.
