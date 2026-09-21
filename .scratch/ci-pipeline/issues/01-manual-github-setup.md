# 01: Manual GitHub & Cloudflare setup (human)

**What to build:** The one-time, human-performed configuration that CI/CD needs and that repo tooling cannot do — this repo has no GitHub API / `gh` access, and the workflow cannot create secrets or Workers by itself. When done, every secret, database, worker, and branch-protection rule the pipeline references already exists, so the deploy tickets can ship and verify immediately.

**Blocked by:** None (can start immediately)

**Status:** ready-for-human

- [ ] Four GitHub repository secrets exist (Settings → Secrets and variables → Actions): `CLOUDFLARE_API_TOKEN` (Workers Edit scope), `CLOUDFLARE_ACCOUNT_ID`, `TURSO_DB_AUTH_TOKEN` (prod), `TURSO_DB_AUTH_TOKEN_STAGING` (staging).
- [ ] A staging Turso DB (`postpony-staging`) exists; its URL is noted for the `env.staging` `TURSO_DB_URL` var and its token used as the staging secret.
- [ ] Both Workers bootstrap-deployed once locally so they exist in the account: staging via `wrangler deploy --env staging`, prod (`postpony`) re-checked if not already set.
- [ ] The staging secret is put (`wrangler secret put TURSO_DB_AUTH_TOKEN` with the staging token) and the worker redeployed so lazy migration sees the token.
- [ ] Branch protection on `main` requires the `unit` and `e2e` status checks (selected after those checks exist in a first pipeline run).
- [ ] The staging worker's workers.dev URL smoke-checked (returns HTTP 200).

**Comments:** Full web-UI/CLI runbook and checklist live in `.scratch/ci-pipeline/spec.md`. Renumbered as ticket 01 (2026-09-22) so the human setup starts before the pipeline code; it remains ready-for-human.