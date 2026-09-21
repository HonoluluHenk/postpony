# Review: 02-gate-workflow

Reviewed diff `41bc51f...HEAD` (commits `dc368b8` ticket done, `a5d68d4` arc42 bump) on two axes in parallel: Standards (repo docs + Fowler smell baseline) and Spec (`.scratch/ci-pipeline/spec.md`, `issues/02-gate-workflow.md`).

## Standards

Reviewed against AGENTS.md, app-npm-scripts + app-arc42-docs skills, ADR-0018/0028. Two commits, no out-of-scope code changes.

- arc42 updates — compliant. §02 (dependency/toolchain), §07 (deployment), §11 (resolved debt) all mapped and edited per `app-arc42-docs`; README "last verified" bumped (rule). §7.5 accurately records the two-job gate and defers staging/prod to tickets 05/06, matching ADR-0028's "four jobs" split.
- npm scripts — compliant. New script + skill table/known-gotcha updated (rule: "add it to package.json (and update this skill)"). `check:actionlint` correctly stays out of `verify`/`lint` (skill documents the `lint:*` wildcard trap).
- Workflow vs ADR-0028 — consistent: `worker:build` as a separate CI-only step (ADR line 16), missing deploy jobs documented, secret-free gate. ADR-0018 consistency stated in the header comment.

### Findings

1. **Ticket record slid out of sync (spec drift, judgement call).** `issues/02-gate-workflow.md` ticked AC-6 still reads *"a manual `lint:actionlint` npm script"* but the implementation landed `check:actionlint`; the record now contradicts code.

2. **`engines.node >= 26` is weaker than the constraint it is cited as evidence for (doc honesty).** `docs/arc42/02-constraints.md` still claims *"Node ≥ 26.1 (native `Temporal`)"* and now cites `package.json (engines.node)` as a source. `"node": ">=26"` admits 26.0.x — either floor to `>=26.1` or soften the constraint row.

3. **Duplicated Code (baseline smell, judgement call).** Both jobs repeat the identical provisioning block (`checkout` → `mise-action` → `npm ci` → `playwright install`) verbatim. Idiomatic for Actions; ADR-0028's pending deploy jobs will make it a quadruple of the same shape — worth a `ponytail` note naming the extraction ceiling, cheap to defer.

### Skipped

Version pins, `unit` job name under-describing scope — harmless, tooling- or ADR-sanctioned.

## Spec

Verified live: `npm run check:actionlint` passes; no deploy jobs; no secrets (`permissions: contents: read`); triggers cover push/PR/dispatch/tag (`push:` unfiltered covers tags); `worker:build` is a separate `unit` step and absent from `verify`; `engines.node >= 26`; `wrangler` already in devDeps at baseline; certs regenerated via `scripts/create-certs.sh` before e2e. All eight ACs functionally satisfied; the only non-doc additions are spec-required.

- **`check:actionlint` vs named `lint:actionlint`** — spec line 50 and AC-6 both literally name `lint:actionlint`; implemented name is `check:actionlint`. **Deviation judged justified.** The spec is internally contradictory: `lint` = `run-s -l lint:*` and `verify` = `npm-run-all -l lint:* test build e2e`, and npm-run-all's wildcard matches single-level `lint:<name>` — so naming it `lint:actionlint` would silently wire it into `verify`, directly violating AC-6's hard constraint "it is NOT wired into `verify`". The rename is the only way to honor the constraint, and the reasoning is documented in `app-npm-scripts/SKILL.md` and arc42 §7.5.
- Minor, non-blocking: `/etc/hosts` `tee -a` appends on every run (harmless).

**Verdict: ship.**

## Summary

Standards: 3 findings (1 spec-drift doc record, 1 doc-honesty mismatch `engines` vs arc42 row, 1 baseline-smell duplication), no hard violations; worst is the arc42 engines-floor mismatch. Spec: 0 missing, 0 creep, 1 justified naming deviation; worst is none. No cross-axis conflict.