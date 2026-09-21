# 07: ADR-0028 + arc42 reconciliation

**What to build:** Keep the record honest once the pipeline exists. Uses the ADR as the decision's source of truth and reconciles the architecture docs to describe the shipped reality — the gate, the tag-driven prod promote, the staging worker, and the resolved coverage risk.

**Blocked by:** 05 (Staging deploy), 06 (Production tag deploy)

**Status:** ready-for-agent

- [x] New ADR records: GitHub Actions verify gate, auto staging deploy on `main` + `workflow_dispatch`, production promote only on a `v*` tag whose name matches the `package.json` version at the tagged commit (tag = version guard), secrets provisioned per env via `wrangler secret put` and refreshed from GitHub secrets on every deploy, account id treated as a secret (not committed); cross-references ADR-0018 and supersedes ADR-0010's residual GitHub-Actions intent.
- [x] arc42 reconciled per the `app-arc42-docs` skill: toolchain/CI constraint added, coverage row now says machine-enforced, staging worker + pipeline in the deployment view, risk of "no CI" resolved and debt row dropped, README verified-commit bumped.
- [x] `CONTEXT.md` unchanged: CI/CD terms are engineering infra, not postponement domain vocabulary.
- [x] Every arc42 "last verified against commit" line bumped together at the end of the change.

**Comments:** Deliberately blocked by 05+06 so the docs are written "as built". Any pipeline shape that ships differently than planned must first be corrected in the ADR before this ticket lands.

## Comments

- Commits: `da189a3` (ticket done), `2ece956` (review), `eb5c6bb` (review-fixed), `a86e8b3` (arc42 verified-commit bump).
- One-line summary: ADR-0028 now records the pipeline as built (verify gate; staging on `main`+dispatch; production only on a `v*` tag equal to the tagged commit's `package.json` version; per-deploy secret refresh via `wrangler secret put`, superseding the plan's manual put-once; `check:actionlint` name deviation; release script deliberately untested) and arc42 §02/§07/§11 are reconciled (mise toolchain + GA gate constraints, staging worker + four-job pipeline in the deployment view, "no CI" risk R3 resolved and its debt row dropped, stale placeholder removed); CONTEXT.md untouched; README verified-commit bumped. Docs-only ticket — verified with `npm run lint` + `npm test` (both green; e2e/verify not runnable in this `--quick` worktree).
- Review fixes folded into `eb5c6bb`: §7.5 `deploy-prod` clarified that only the Cloudflare credentials are shared with staging (prod Turso token `TURSO_DB_AUTH_TOKEN` vs staging `TURSO_DB_AUTH_TOKEN_STAGING`); ticket AC1 checkbox wording updated from stale "secrets provisioned manually per env" to the shipped per-deploy refresh.
- The `REPLACE`-placeholder staging `TURSO_DB_URL` in `wrangler.jsonc` and the end-to-end pipeline verification (real tag push → staging/prod deploys, guard refusal) remain ticket-01/human-checklist items, out of this docs-only ticket's scope.