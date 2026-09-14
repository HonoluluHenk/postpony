# Coverage >= 90% is not machine-enforced

Status: ready-for-agent

## Summary

`AGENTS.md` requires "coverage >= 90% for all metrics", but vitest has no `thresholds` block, so nothing fails when coverage drops.

## Evidence

- `vitest.config.ts:7-12` enables coverage (v8) but configures no `thresholds`.
- `AGENTS.md` states the 90% policy.

## Acceptance criteria

- Add a `coverage.thresholds` block to `vitest.config.ts` matching the 90%-for-all-metrics policy (branches, functions, lines, statements).
- Verify `npm run test` still passes (or raise the floor to current coverage and note the gap as debt).
