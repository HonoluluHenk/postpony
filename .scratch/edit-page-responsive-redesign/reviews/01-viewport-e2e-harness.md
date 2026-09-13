# Review: 01-viewport-e2e-harness

**Fixed point:** `c15d3ca` (base before ticket work) → `f007011` (ticket done)
**Diff:** `git diff c15d3ca...HEAD`
**Commit reviewed:** `f007011 ticket done: 01-viewport-e2e-harness`

Note: the `code-review` skill prescribes two parallel sub-agents (Standards + Spec). This
session has no Task/sub-agent tool, so both axes were run in a single pass by the reviewer;
the two axes are still reported separately below and not merged or reranked.

## Standards

Source of standards: `AGENTS.md` (lint rules, conventions), `eslint.config.js`
(strictTypeChecked, `no-unused-vars`, `explicit-function-return-type`,
`restrict-template-expressions`), `testing` skill (fixtures import, Page Objects, checkA11y).

- `viewports.ts` — named `viewports` object is `as const`, `ViewportName` derived via
  `keyof typeof`, so everything is strongly typed (no "stringly" names). ✓
- `setViewport(page: Page, name: ViewportName): Promise<void>` — explicit return type, typed
  param, no `any`. ✓
- `viewport-smoke.e2e.ts` — imports `test` from `./fixtures` (not `@playwright/test`), uses
  the `EditPage` Page Object and `checkA11y` per the testing skill. ✓
- `restrict-template-expressions` — the `${name}` interpolation is a `ViewportName` (string);
  allowed. ✓
- `no-unused-vars` — no unused imports; `page` and `checkA11y` are both consumed. ✓
- `tsc -p tsconfig.e2e.json --noEmit` and `eslint` on both new files: clean (exit 0). ✓

Judgement calls / observations (no hard violation):

- **Consistent duplicate "phone" definition.** `e2e-tests/responsive.e2e.ts:5` hardcodes
  `PHONE_VIEWPORT = {width: 375, height: 667}`, whereas the new canonical
  `viewports.phone` is `390x844`. The ticket explicitly mandates 390x844 and says existing
  tests stay untouched, so the difference is intentional. Future consolidation (pointing
  `responsive.e2e.ts` at `viewports`) is out of scope for this ticket.
- **`viewportNames = Object.keys(viewports) as ViewportName[]`** is a narrowing cast. It keeps
  a single source of truth (adding a key to `viewports` automatically adds it to
  `viewportNames`, avoiding drift). eslint/tsc accept it; not a "stringly" smell because the
  exported type stays `ViewportName[]`.
- No smell-baseline hits (no duplicated logic beyond the intentional viewport divergence above,
  no speculative generality — `viewportNames` is consumed by the smoke test, `setViewport` is
  the requested helper).

## Spec

Source of spec: `.scratch/edit-page-responsive-redesign/issues/01-viewport-e2e-harness.md`
(and the Testing Decisions section of `spec.md`).

- **Criterion 1 (helper sets named viewport):** `viewports.ts` defines `phone` 390x844,
  `tablet` 820x1180, `desktop` 1282x745, and `setViewport(page, name)` applies it. Exact
  dimensions match. ✓
- **Criterion 2 (smoke test at each width + checkA11y):** `viewport-smoke.e2e.ts` loops over
  `viewportNames`, calls `setViewport`, seeds a Postponement via
  `EditPage.createSession(page, ['2026-03-05T20:00'])`, then `checkA11y()`. ✓
- **Criterion 3 (existing editing tests + baselines untouched/green):** no changes to
  `postponement-editing.e2e.ts` or its `*-snapshots`; `npm run verify` ran the full
  postponement-editing suite green (tests 48-62), including the `edit-*.png` screenshot
  baselines. ✓
- **Criterion 4 (`npm run verify` passes):** `npm run verify` → lint + test + build + e2e all
  green; e2e reported `102 passed`. ✓
- **Scope check:** no scope creep. The change is additive (two new e2e files + ticket ticks);
  no production code, no existing test, no baseline touched. ✓

## Summary

Standards: 0 hard violations (2 judgement-call observations, intentional).
Spec: 0 findings — all four acceptance criteria implemented and verified green.
