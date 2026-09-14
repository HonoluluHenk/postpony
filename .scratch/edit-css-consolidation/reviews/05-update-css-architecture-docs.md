# Code review: 05-update-css-architecture-docs

Fixed point: `71555bc` (`git diff 71555bc...HEAD`).
Commits under review: `9a90733 ticket done: 05-update-css-architecture-docs`.
Spec: `.scratch/edit-css-consolidation/spec.md`. Ticket: `.scratch/edit-css-consolidation/issues/05-update-css-architecture-docs.md`.
Standards sources: `AGENTS.md`, `.agents/skills/css-styling/SKILL.md` (elsewhere), `.agents/skills/writing-for-agents/SKILL.md`, ADRs 0004/0019. Docs-only diff; no app code, so testing/code conventions don't bind beyond doc accuracy.

(Sub-agents unavailable in this environment; both axes were reviewed directly.)

## Standards

- **No hard violations.** The diff is three docs edits: the skill's file set, its token catalog, and the ticket checkboxes. No build/test surface touched.
- **Judgement call — layer attribution of the `@font-face` rules.** The architecture line reads `style.css — design: app selectors + self-hosted @font-face declarations`, and the file-structure line says both are `wrapped in @layer design`. The six `@font-face` rules in `src/public/assets/css/style.css:1-43` are **unlayered** — they sit *above* the `@layer design` block (line 45). A maintainer could infer the faces are inside the layer. The doc itself says otherwise 40 lines later, so the fix is to state once, precisely, that the faces are unlayered. Real but minor.
- **Smell baseline:** none apply. Prose + tables, no control flow, no duplicated shape worth extracting.

## Spec

- **Acceptance 1 — file set.** The skill now describes `design-tokens.css`, `style.css` (with the migrated edit-page section and the six `@font-face` rules), the vendored `beer.min.css`, `air-datepicker.css`, and the self-hosted font dir. `--container-max-width` corrected from the stale `800px` to the real `75rem`. ✔
- **Acceptance 1 — token catalog.** All ticket-02 additions present and matching `design-tokens.css`: half-steps + `--space-7`; `--font-size-xs…xl`; `--radius-sm/card/pill`; `--sidebar-width`/`--date-cell-width`/`--edit-max-width`; `--chip-*-bg`/`--chip-*-fg` with the warn pair pointing at `--warning-container`/`--on-warning-container`. ✔
- **Acceptance 2 — stale references.** `main.eta` → `main.tsx` fixed in the cascade section. `CONTEXT.md` names no CSS files, so no change was required there. One strict-reading issue: the line "The former `edit-redesign.css` prototype is gone" still carries the deleted filename, while the orchestrator instruction is that the deleted file "must NOT be listed" and the acceptance box asks that no stale file reference remain. The intent (prototype gone) is right; naming the file again is avoidable. Real but minor.
- **Acceptance 3 — lint.** `npm run lint` clean (tsc source, tsc e2e, eslint). Docs-only, as expected. ✔
- **Scope.** No app code, no `CONTEXT.md` change forced where none was needed, no new files. Aligns with the ticket's "docs must match implementation". ✔

Summary: Standards 0 hard violations / 1 judgement call (unlayered `@font-face` attributed to the design layer); Spec complete with 1 strict-reading finding (deleted filename still named in prose). Both are doc-accuracy nits, fixed in `review-fixed`.
