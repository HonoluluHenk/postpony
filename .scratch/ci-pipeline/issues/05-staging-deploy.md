# 05: Staging deploy

**What to build:** The first deployment slice: a staging Worker (`postpony-staging`, workers.dev URL, its own isolated Turso DB) that automatically receives every `main` merge and every manual `workflow_dispatch`, gated on the CI checks passing. After this ticket, any merged commit is live and verifiable at the staging URL — the honest rehearsal of production, including lazy migration.

**Blocked by:** 01 (Manual GitHub & Cloudflare setup), 02 (Gate-only workflow)

**Status:** ready-for-agent

- [x] Staging Worker configuration exists: separate env block with name `postpony-staging`, workers.dev URL, no custom-domain route, and the staged `TURSO_DB_URL` var; production config untouched.
- [x] A `deploy-staging` job in the same workflow deploys on `main` merges (needs `unit` + `e2e` first) and on `workflow_dispatch`.
- [x] The staging auth token is injected from the GitHub secret, not committed; the Cloudflare API token and account id come from GitHub secrets.
- [x] No migration step in the pipeline: the worker migrates the store lazily on first request, so a deploy is just a deploy.
- [ ] End-to-end verified: after a merge (or dispatch), the staging workers.dev URL serves the new build and returns 200.

**Comments:** Staging exists to be the closest automated proxy for production (see ADR). Refuses to auto-promote to prod — that is ticket 06.

## Comments

- Commits: `9070e19` (ticket done), `43a9fda` (review), `e53cec7` (review-fixed). A parallel agent's `b992036` (partial `wrangler.jsonc` env block, no `name`) was superseded by the authoritative env block inside `9070e19`.
- One-line summary: `env.staging` (name `postpony-staging`, workers.dev, no custom route, committed `TURSO_DB_URL` var) plus a gate-`if`'d `deploy-staging` job (needs `unit`+`e2e`, main push + `workflow_dispatch` only) that refreshes the Worker's Turso token from GitHub secrets on each deploy — verify gate green, actionlint green, `wrangler deploy --dry-run --env staging` green.
- **AC-5 left unticked (deferred to ticket 01):** the last AC ("staging workers.dev URL returns 200") needs the ticket-01 human infrastructure — GitHub secrets and the `postpony-staging` Worker + Turso DB do not exist yet. Code-level provable parts are done and verified: workflow YAML via `npm run check:actionlint`, staging config/bundle via `wrangler deploy --dry-run --env staging` (no credentials; runs to the dry-run exit).
- **Staging Turso DB URL is a committed placeholder** (`libsql://postpony-staging.aws-eu-west-1.turso.io`), flagged `REPLACE` in `wrangler.jsonc`; ticket 01 must swap in the real `postpony-staging` DB URL.
- ADR-0028 amended in `e53cec7`: the Secrets decision + rationale now record staging's CI-per-deploy `wrangler secret put` (fed from the GitHub secret, fail-loud if empty) and production's human one-time put, resolving the review's spec-vs-ADR contradiction.
- Heads-up on the shared worktree: uncommitted ticket-03 artifacts (`scripts/release.mjs`, `eslint.config.js`, `package.json` `release` script, docs edits) were present and untouched by this ticket; the parallel writer also touched `docs/arc42/07-deployment-view.md`, `.agents/skills/app-npm-scripts/SKILL.md`, and `issues/01-manual-github-setup.md` — all out of this ticket's scope, left for their owners.