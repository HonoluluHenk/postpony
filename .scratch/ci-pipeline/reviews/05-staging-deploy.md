# Review: 05-staging-deploy

Reviewed diff `a38fc0b...HEAD` (commits `b992036` parallel `wrangler.jsonc` env block, `9070e19` ticket done) on two axes in parallel: Standards (AGENTS.md / ADR-0028 / prior review record + Fowler smell baseline) and Spec (`.scratch/ci-pipeline/spec.md`, `issues/05-staging-deploy.md`). Live checks: actionlint green, `wrangler deploy --dry-run --env staging` resolves (name `postpony-staging`, assets + committed `TURSO_DB_URL`, no custom route), `--env=""` needed since the env block exists.

## Standards

Security clean: secrets only via `${{ secrets.* }}`, nothing committed, `echo`-pipe is the standard masked pattern. `deploy-staging` `if:` gate and `env.staging` contents match ADR. ACs in the ticket accurately ticked; placeholder staging DB URL is flagged `REPLACE` for ticket 01.

### Findings

1. **ADR-0028 contradiction (hard-ish):** ADR line 22 says "worker secrets are `wrangler secret put` per env **by a human**" and line 27 rationale rejects "a second copy of the Turso token in GitHub's secret store" — but the committed job (ci.yml:115-116) re-`secret put`s the staging token **from the GitHub secret on every deploy**. Ticket AC-3 and spec line 51 mandate the GitHub-secret injection, so the code follows the ticket and the ADR is stale. Per ticket 07's own directive ("any pipeline shape that ships differently than planned must first be corrected in the ADR"), amend ADR-0028 now.
2. **Empty-secret failure mode (spec reviewer, same area):** a missing/misnamed `TURSO_DB_AUTH_TOKEN_STAGING` secret pipes one empty newline into `wrangler secret put` — no fail-fast — and staging would deploy with dead DB auth.
3. **Mysterious / unmarked workaround — `package.json` `worker:build` gains `--env=""`:** correct and wrangler-prescribed, but the intent is opaque and no ponytail-style comment names why. Consequence: the unit job's bundle validation now targets the top-level (production) config only; the staging bundle is never dry-run-tested before `deploy-staging` ships it.
4. **Divergent Change / provisioning duplication:** third copy of the checkout→mise→npm ci block; the updated `# ponytail` comment (ci.yml:19-23) names the extraction ceiling accurately. Compliant, no action. Speculative forward-references to ticket 06 are prose-only, acceptable.

## Spec

AC-1..4 implemented and verified (dry-run, actionlint, binding names match `worker.ts` env reads). AC-5 deferred by pre-agreement (ticket-01 human infra absent) — not a missing requirement. No scope creep; `--env=""` is a required consequence of adding the env block, not creep. Job gating verified clean: staging deploys only on `refs/heads/main` push + `workflow_dispatch`; tag/feature-branch/PR pushes excluded.

### Findings

1. Same ADR contradiction as Standards (spec-internal: spec line 51 backs the GitHub-secret copy, ADR rejects it; code picks the ticket). Decide which wins — ADR reads as decision of record, so amend it.
2. Empty-secret failure mode (see Standards 2).
3. Committed placeholder staging DB URL (`libsql://postpony-staging.aws-eu-west-1.turso.io`): commented `REPLACE`, acceptable, but nothing blocks a real deploy before ticket 01 replaces it — flag for the ticket-01 handoff, not a defect.

## Summary

Standards: 4 findings (1 hard doc-drift, 3 judgement calls), worst is the ADR contradiction. Spec: 3 findings, worst the empty-secret failure mode. Both axes independently converge on the same two fixes: (a) amend ADR-0028 to record the staged/CI secret flow, (b) make the secret-put step fail loud when the GitHub secret is empty. Fixes committed as `review-fixed: 05-staging-deploy`; the staging-URL placeholder handoff and arc42 reconciliation stay with tickets 01 / 07.