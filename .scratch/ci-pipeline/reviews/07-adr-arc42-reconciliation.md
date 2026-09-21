# Code review — 07-adr-arc42-reconciliation

Reviewed: `git diff HEAD` (uncommitted working-tree change) in the `ci-pipeline` worktree, split across the two standard axes (Standards / Spec), run as parallel sub-agents.

## Standards

- **Hard (acknowledged, deferred by flow):** `docs/arc42/README.md:5` "Last verified against commit" not yet bumped — `app-arc42-docs` rule 1 requires every edit to bump it. This ticket bumps it once, at the end of the change (ticket AC4), in its own "docs: bump arc42 verified commit" commit referencing the final docs commit — the exact pattern tickets 02/03/06 used. Not fixed inside `ticket done`.
- **Judgement call (kept, repo pattern):** `check:actionlint` naming rationale is near-verbatim in ADR-0028 and §7.5. The ADR is the source of truth and §7.5 points at it; duplicating the one-line rationale in the deployment view keeps §7.5 self-contained, matching how the section documents the other manual scripts. No change.
- **Minor (fixed in `review-fixed`):** §7.5 `deploy-prod` says "credentials from the same GitHub secrets as staging" — true only for the Cloudflare pair (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`); the Turso token differs (`TURSO_DB_AUTH_TOKEN` vs staging's `TURSO_DB_AUTH_TOKEN_STAGING`). Reworded to be precise.
- Verified accurate: mermaid §7 valid (unique node ids, cross-subgraph edges, cylinder syntax); ADR-0028 matches shipped `ci.yml`/`wrangler.jsonc`/`package.json`/`release.mjs`; `check:` name dodges the `lint:*` wildcard; plain-`X.Y.Z` release path real; ADR-0010 status + cross-refs consistent.

## Spec

- **Minor (fixed in `review-fixed`):** ticket AC1 wording says "secrets provisioned manually per env" — stale relative to shipped reality (per-deploy refresh, which the ADR now records). Checkbox text updated to match as-built so the tick is honest.
- Verified: ADR-0028 and arc42 §02/§07/§11 match the shipped pipeline (gate, staging on main/dispatch, prod tag guard, per-deploy secret refresh with fail-loud guards, `env.staging` shape, release bootstrap, coverage machine-enforced, R3 resolved, debt row dropped). `CONTEXT.md` untouched (AC3) ✓. No missing requirement except the deferred README bump (AC4, by flow).
- No scope creep found beyond the ticket's explicit reconciliation mandate.

## Verdict

Both axes pass with two minor wording fixes (folded into `review-fixed`); the one hard Standards finding (README bump) is performed by flow at the end of the change.