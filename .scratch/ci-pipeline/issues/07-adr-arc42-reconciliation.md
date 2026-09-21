# 07: ADR-0028 + arc42 reconciliation

**What to build:** Keep the record honest once the pipeline exists. Uses the ADR as the decision's source of truth and reconciles the architecture docs to describe the shipped reality — the gate, the tag-driven prod promote, the staging worker, and the resolved coverage risk.

**Blocked by:** 05 (Staging deploy), 06 (Production tag deploy)

**Status:** ready-for-agent

- [x] New ADR records: GitHub Actions verify gate, auto staging deploy on `main` + `workflow_dispatch`, production promote only on a `v*` tag whose name matches the `package.json` version at the tagged commit (tag = version guard), secrets provisioned manually per env via `wrangler secret put`, account id treated as a secret (not committed); cross-references ADR-0018 and supersedes ADR-0010's residual GitHub-Actions intent.
- [x] arc42 reconciled per the `app-arc42-docs` skill: toolchain/CI constraint added, coverage row now says machine-enforced, staging worker + pipeline in the deployment view, risk of "no CI" resolved and debt row dropped, README verified-commit bumped.
- [x] `CONTEXT.md` unchanged: CI/CD terms are engineering infra, not postponement domain vocabulary.
- [ ] Every arc42 "last verified against commit" line bumped together at the end of the change.

**Comments:** Deliberately blocked by 05+06 so the docs are written "as built". Any pipeline shape that ships differently than planned must first be corrected in the ADR before this ticket lands.