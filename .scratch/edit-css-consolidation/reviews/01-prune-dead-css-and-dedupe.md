# Code review: 01-prune-dead-css-and-dedupe

Fixed point: `aa0b0a2` (`git diff aa0b0a2...HEAD`).
Commits under review: `123433f ticket done: 01-prune-dead-css-and-dedupe`.
Spec: `.scratch/edit-css-consolidation/spec.md`. Ticket: `.scratch/edit-css-consolidation/issues/01-prune-dead-css-and-dedupe.md`.
Standards sources: `AGENTS.md`, `.agents/skills/css-styling/SKILL.md`, ADRs 0004/0005/0019, plus the Fowler smell baseline.

(Sub-agents unavailable in this environment; both axes were reviewed directly.)

## Standards

- **No hard violations.** The change is deletion-only plus one comment rewrite, so it cannot introduce a token/literal, naming, or accessibility breach. `css-styling` convention 4 ("new selectors go in `style.css`") is respected; the `edit-redesign.css` deletion is within ticket scope.
- **Duplicated Code (resolved, judgement call):** the two `@media (max-width: 992px)` blocks and two `@media (max-width: 599px)` blocks are exactly the smell the ticket targeted; the diff leaves one each (plus the unrelated `prefers-reduced-motion` block). Good.
- **Stale comment (minor, judgement call):** the retained comment above `.list .max` still explains the rule in terms of "proposed-date strings". The proposed-date card family that motivated it is gone, but `.list` remains live on the join/generate pages, so the rule itself is reachable. Not a violation; comment could be reworded in a docs pass.
- **No baseline smells** (Feature Envy, Primitive Obsession, etc.) apply to a stylesheet diff of this shape.

## Spec

- Dead selectors gone: `clipboard-btn`, `heading-row`, `invite-link-row`, the full `.proposed-date-*` family (including the now-empty 992px block) removed from `style.css`; `generator-grid`/`generator-day`/`generator-time`, `not-joined`, and `roster` removed from `edit-redesign.css`. Verified unreachable first: no match in `src/**/*.tsx`, `src/public/assets/**` (non-CSS), vendored files, or e2e (the only `proposed-date-list` hit is a stale comment in `e2e-tests/proposed-date-generator.e2e.ts:135`, not a selector). `.clash-row` stays live on `.date-row`, so its rule's precondition (`.proposed-date-card`) is what died, not the class.
- One media block per breakpoint: `style.css` now has exactly one `@media (max-width: 992px)` and one `@media (max-width: 599px)`. The `599px` merge keeps the generator overrides *after* their base rules, so cascade/tie-break order is preserved.
- Picker `!important` removed (all three); the button's design-layer rule still outranks vendor. No screenshot baseline changed, and the picker-bearing edit page is in the visual suite, so "still sits over the right edge of its field" is proven by unchanged pixels.
- Gate: `npm run lint`, `npm run test`, `npm run e2e` all pass; `git status --short` shows no `e2e-tests/**/*.png` change.

Summary: Standards 0 hard violations / 1 minor judgement call (stale `.list .max` comment); Spec complete, no missing or wrong requirements.
