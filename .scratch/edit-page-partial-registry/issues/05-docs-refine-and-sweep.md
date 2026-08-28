# 05: Docs refine and verify sweep

**What to build:** the public agent-facing description of partial-vs-page composition matches the new reality; full CI gate passes; dead imports gone.

**Blocked by:** 02-partial-renderer-uses-registry, 03-edit-page-uses-registry, 04-error-container-drops-isOob

**Status:** ready-for-agent

### What ships

- AGENTS.md "partial vs initial render gotcha" line is replaced with: "The EditPartials registry (`src/routes/edit/id/partial-registry.ts`) is the source of truth for which HTMX swap targets the partial endpoint emits; every entry appears in `<EditPage>` by virtue of being a registry entry."
- Any leftover dead imports or now-redundant helper functions removed.
- `npm run verify` (lint → test → build → e2e) passes end-to-end.
- Coverage report still ≥ 80% across all metrics.
- No `oob?: boolean` or `isOob` references anywhere in the codebase (`rg` confirmed).

### Acceptance criteria

- [ ] No string `oob?` or `isOob` remains in `src/`; verified by ripgrep.
- [ ] AGENTS.md partial-vs-page note is replaced (no removal, refinement only).
- [ ] `npm run lint`, `npm run test`, `npm run build`, `npm run e2e` all green.
- [ ] Coverage report attached in the PR description (or noted as unchanged at ≥ 80%).
- [ ] Visual regression baselines for the edit page (initial + partials) unchanged.
