# Review: 06-prod-tag-deploy

Reviewed diff `a477b09...HEAD` (commits `2d3dab9` ticket done, `5450c81` arc42 verified-commit bump) on two axes in parallel: Standards (AGENTS.md / ADR-0028 / review 05 record / Fowler smell baseline) and Spec (`.scratch/ci-pipeline/spec.md`, `issues/06-prod-tag-deploy.md`, ADR-0028 Decision section). Live check baseline: actionlint green, `wrangler deploy --dry-run --env=""` (top-level prod config) resolves with committed `TURSO_DB_URL`, guard smoke-tested accept (`v1.0.0`) and reject (`v9.9.9`) locally.

## Standards

Both findings the sibling staging review (05 §Standards 1–2) made are fixed: ADR-0028 line 22 now records both deploy jobs refreshing `TURSO_DB_AUTH_TOKEN` from their GitHub secrets (no more "put once by a human"), and `deploy-prod`'s secret step mirrors staging's fail-loud `[ -z ... ]` + `printf '%s'` pattern — dead-DB-auth minting is guarded on both workers. Secret handling clean: only `${{ secrets.* }}`, account id kept secret per ADR. `if:` = `github.event_name == 'push' && startsWith(github.ref, 'refs/tags/v')` correctly excludes branches/PRs/dispatch; the ref-prefix pin also defeats a branch literally named like a tag. Guard reads the checked-out `package.json` at the tag commit and fails before any account operation, per ADR decision.

### Findings

1. **[judgement] In-job dry-run deliberately omitted from `deploy-prod`.** `unit`'s `worker:build` (`--env=""`) already dry-runs the exact top-level config `deploy-prod` ships, and `deploy-prod` `needs` `unit` anyway — so staging's in-job dry-run is not mirrored. Sound and intended, but the rationale is not stated in the job comment. No action.
2. **[judgement] Ticket `Status:` still `ready-for-agent`** despite the "ticket done" commit — matches the precedent set by tickets 03/05 (they also left it). No action.
3. **[trivia] ci.yml ends without trailing newline** — pre-existing. No action.
4. **Duplicated provisioning block** — the fourth checkout→mise→npm ci copy; the `# ponytail:` comment names the ceiling and the now-actionable composite-action upgrade path. Compliant, deferred by ticket scope.

## Spec

AC-1..4 implemented and verified. AC-5 (E2E both ways) stays unticked — consistent with the spec's Testing Decisions (workflow validated by actionlint + real integration run; behavior verification lives in the issue-04 human checklist; the `--quick` worktree cannot push tags or reach Cloudflare). Guard placement, `needs: [unit, e2e]`, secret intake, and the no-`--env` deploy all match ticket + guardrail.

### Findings

1. **[hard-ish, doc-drift] Spec l.51/l.67 still describe secrets as "put once per env" and list "automating secret provisioning" (secret:bulk) as out of scope.** The committed job auto-refreshes the production Worker secret on every release deploy. The ADR was amended within this diff to record the ship-shape (ticket 07's "correct the ADR first" rule); the spec remains the pre-decision planning text — same handling as ticket 05. Flag for ticket 07's reconciliation.
2. **[minor] Guard is shell embedded in YAML only, no committed runnable check** — the accept/reject paths were smoke-tested manually and are recorded in the ticket Comments; the spec's Testing Decisions explicitly exempt workflow YAML from the coverage surface, so nothing further is owed.
3. **Nothing missing** among the ticked ACs; ADR-0028 Decision now matches the committed job.

## Summary

Standards: 4 findings, all judgement calls/trivia; worst is the unstated dry-run delegation rationale (no action per the reviewer's own verdict: "standards-compliant, no action required"). Spec: 3 findings; worst is the spec/ADR drift already corrected at the ADR level this ticket. Both axes concur: no blocking defects, no fixes to make — no `review-fixed` commit, review record only.