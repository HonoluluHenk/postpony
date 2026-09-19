# Review: 09-app-wide-theme-consistency

Reviewed: commit `fdebf01` (`ticket done: 09-app-wide-theme-consistency`) against spec `.scratch/edit-vote-ui-a11y/spec.md` and ticket `.scratch/edit-vote-ui-a11y/issues/09-app-wide-theme-consistency.md`.

Run inline (no Task tool available in this subagent run) along the skill's two axes.

## Standards

- **Minor — missing trailing newline** in the new `src/public/assets/css/design-tokens.spec.ts` (every other project file ends with one). Fixed in the `review-fixed` commit.
- **Judgement call (spec override) — Duplicated Code**: `design-tokens.css` re-lists the vendor Inter/Roboto stack verbatim behind `'IBM Plex Sans'`. This is not avoidable (a `var(--font)` self-reference would recurse) and is exactly what the spec demands ("The BeerCSS/Inter fallback list stays as an exhausted fallback", spec line 74). Accepted.
- **Judgement call — `--font` naming shadows the vendor token of the same name.** Intentional: overriding BeerCSS's `--font` in the higher-priority design layer is the single-line mechanism that makes the self-hosted family apply to `body{font-family:var(--font)}` on every page with no per-page rule. Documented in the token comment and arc42 8.11. Accepted.
- Otherwise conformant: typed spec relaxations used as the repo prescribes, `function` declarations, no new dependency, no unused identifiers, coverage-seam test placement (`src/public/assets/css`) is coherent with the existing assets-guard (specs there are never served).

## Spec

All four acceptance criteria are implemented:

1. **Single family app-wide / condensed scoped**: `--font` (Plex first + vendor list) overrides the BeerCSS token; `--font-sans` aliases it so the edit rules keep the same family; `--font-condensed` remains only in `.edit-redesign .date-cell, .date-num` (guarded by `design-tokens.spec.ts`).
2. **`color-scheme`**: `color-scheme: light` on `:root`; no dark palette token introduced (only `--theme-color`, which resolves to the existing `.light --surface`).
3. **theme-color sourced from token**: the layout meta renders with no hex literal (guarded by `main.spec.tsx` `not.toContain('#fdf8fd')`); `ui.js` `initThemeColor` copies `--theme-color` (=`var(--surface)`) into it; browser spec covers copy / no-token / no-meta branches.
4. **Spot a11y pass**: cannot be run here (coordinator runs e2e) — delegated and noted in the report/issue Comments.

No scope creep: the `main.js` wiring, `ui.spec.js`/`main.spec.tsx` updates, and arc42 8.11 note are each required by the criterion they support or by AGENTS.md ("update the matching arc42 sections and bump the line"). No locale keys added (as instructed).

## Summary

Standards: 1 finding (missing trailing newline, fixed). Spec: 0 missing, 0 scope creep.