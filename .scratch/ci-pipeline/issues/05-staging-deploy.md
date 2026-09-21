# 05: Staging deploy

**What to build:** The first deployment slice: a staging Worker (`postpony-staging`, workers.dev URL, its own isolated Turso DB) that automatically receives every `main` merge and every manual `workflow_dispatch`, gated on the CI checks passing. After this ticket, any merged commit is live and verifiable at the staging URL — the honest rehearsal of production, including lazy migration.

**Blocked by:** 01 (Manual GitHub & Cloudflare setup), 02 (Gate-only workflow)

**Status:** ready-for-agent

- [ ] Staging Worker configuration exists: separate env block with name `postpony-staging`, workers.dev URL, no custom-domain route, and the staged `TURSO_DB_URL` var; production config untouched.
- [ ] A `deploy-staging` job in the same workflow deploys on `main` merges (needs `unit` + `e2e` first) and on `workflow_dispatch`.
- [ ] The staging auth token is injected from the GitHub secret, not committed; the Cloudflare API token and account id come from GitHub secrets.
- [ ] No migration step in the pipeline: the worker migrates the store lazily on first request, so a deploy is just a deploy.
- [ ] End-to-end verified: after a merge (or dispatch), the staging workers.dev URL serves the new build and returns 200.

**Comments:** Staging exists to be the closest automated proxy for production (see ADR). Refuses to auto-promote to prod — that is ticket 06.