# Code review: 02-add-design-token-catalog

Fixed point: `9f2a74b` (`git diff 9f2a74b...HEAD`).
Commits under review: `e3fb7d4 ticket done: 02-add-design-token-catalog`.
Spec: `.scratch/edit-css-consolidation/spec.md`. Ticket: `.scratch/edit-css-consolidation/issues/02-add-design-token-catalog.md`.
Standards sources: `AGENTS.md`, `.agents/skills/css-styling/SKILL.md`, ADRs 0004/0005/0019, plus the Fowler smell baseline.

(Sub-agents unavailable in this environment; both axes were reviewed directly.)

## Standards

- **No hard violations.** The change is additive-only to `design-tokens.css`: every hunk is a `+` line inside the existing `@layer design { :root { ... } }` block, so no selector, layer, or existing token value is touched. `css-styling` convention 2 ("token, not literal") and convention 6 ("spacing — prefer the scale") are honored rather than broken: the half-steps extend the existing `--space-N` scale, and the chip foregrounds reuse existing tokens instead of new literals.
- **Naming consistent (judgement call, no issue).** `--space-0-5`/`--space-1-5`… follow the established `--space-N` naming; `--font-size-*`, `--radius-*`, `--sidebar-width`/`--date-cell-width`/`--edit-max-width`, and `--chip-*-bg`/`-fg` are self-describing and match the spec's vocabulary.
- **Additive ordering (trivial, no action).** The half-step tokens are appended after `--space-6` rather than interleaved in numeric order, and the new groups sit in dedicated commented sections. CSS custom-property declaration order is irrelevant, and the grouping reads clearly, so this is not worth churn.
- **No baseline smells** (Duplicated Code, Primitive Obsession, Speculative Generality, etc.) apply: this is a declarative token list, not logic. Note that stocking the full catalog is *not* speculative generality — the spec explicitly makes this an expand-only step so the migration has a vocabulary.

## Spec

- **All stated values present and exact.** Spacing `--space-0-5` 0.125rem, `--space-1-5` 0.375rem, `--space-2-5` 0.625rem, `--space-3-5` 0.875rem, `--space-4-5` 1.25rem, `--space-7` 4rem; type xs/sm/md/base/lg/xl = 0.75/0.85/0.9/1/1.1/1.3rem; radius pill 999px / card 8px / sm 6px; layout sidebar 300px / date-cell 11rem / edit-max 72rem. All match the ticket.
- **Chip values match `edit-redesign.css` exactly.** `clean` → `#eef1fb` / `var(--primary)` (prototype `.chip--clean`), `warn` → `#fff6e6` / `var(--warning)` i.e. `#b26a00` amber (prototype `.chip--warn`), `error` → `#fdecec` / `var(--error)` (prototype `.chip--error`). The warning foreground keeps its current amber.
- **No existing token changed.** `git diff` shows additions only; `--space-1..6`, `--primary`, `--border-radius`, fonts, palette, spinner untouched.
- **Nothing consumes the tokens yet.** `rg "var\(--(space-0-5|…|chip-)"` over `src/` and `e2e-tests/` returns no references, so the rendered app and screenshot baselines are unaffected.
- **Gate:** `npm run lint`, `npm run test` (686 passed) and `npm run e2e` (118 passed) all pass; `git status --short` shows no `e2e-tests/**/*.png` change.
- **Not in this ticket (expected):** the `css-styling` skill's catalog still lists only the pre-existing tokens. The spec stages docs as the final commit, so this is correctly deferred.

Summary: Standards 0 hard violations / 0 actionable judgement calls; Spec complete, no missing or wrong requirements.
