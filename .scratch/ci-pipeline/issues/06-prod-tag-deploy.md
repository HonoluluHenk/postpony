# 06: Production tag deploy

**What to build:** The production promotion path and its guardrail: a `deploy-prod` job that fires only when a `v*` tag is pushed, passes `unit` + `e2e`, and refuses to deploy unless the tag name equals the `package.json` version at the tagged commit. After this ticket, the only way a build reaches `spielverlegung.date` is an explicit, versioned, gate-checked tag push.

**Blocked by:** 01 (Manual GitHub & Cloudflare setup), 02 (Gate-only workflow), 03 (Release script)

**Status:** ready-for-agent

- [x] A `deploy-prod` job fires on `v*` tag pushes only (never on merge, PR, or dispatch) and requires `unit` + `e2e`.
- [x] It deploys to the production worker with the production Turso auth token from the GitHub secret; Cloudflare API token and account id come from GitHub secrets.
- [x] The tag → version guard: the job compares the pushed tag against the `package.json` version at that commit and refuses on mismatch.
- [x] No migration step: production relies on the same lazy migration the staging rehearsal proved.
- [ ] End-to-end verified both ways: a release-script tag (ticket 03) pushed by the human updates production; a deliberately mismatched tag triggers the guard and fails without deploying.

**Comments:** Needs a real tag to verify, which is why ticket 03 (release script) blocks it. The human setup (ticket 01) must exist for the prod secret and bootstrapped worker.

AC-5 stays unticked: it requires a real pushed tag, a GitHub Actions run, and the Cloudflare/Turso infra from ticket 01 (human setup), all absent in this worktree run. Proven locally: workflow shape + actionlint, the guard's accept/reject logic (smoke-tested against `v1.0.0` vs `v9.9.9`), and `wrangler deploy --dry-run --env=""` for the production bundle. The ticket-01 human checklist must still verify E2E both ways: (1) `npm run release` → push tag → `deploy-prod` updates `spielverlegung.date`; (2) a deliberately mismatched tag (e.g. `v9.9.9`) is refused by the guard before any deploy.

## Comments

- Commits: `2d3dab9` (ticket done), `5450c81` (arc42 verified-commit bump), `59bbcdf` (review). No `review-fixed` commit: both review axes cleared the diff with no blocking defects and no required fixes — the two findings inherited from the ticket-05 review (ADR "put once by a human" drift, empty-secret fail mode) were already fixed inside `2d3dab9` (ADR-0028 amended per ticket 07's "correct the ADR first" rule, fail-loud secret step mirrors staging).
- One-line summary: new `deploy-prod` job in `.github/workflows/ci.yml` — `needs: [unit, e2e]`, gated to `push` + `refs/tags/v` (merge/PR/dispatch unreachable), refuses (exit non-zero, before any account operation) unless `GITHUB_REF_NAME` equals `v${package.json version}` at the tagged commit, then fail-loud refreshes the production `TURSO_DB_AUTH_TOKEN` Worker secret from the GitHub secret and runs `npm run worker:deploy` (no `--env` → `postpony` on `spielverlegung.date`). No migration step; `worker:build` in `unit` already dry-runs the exact prod bundle, so no in-job dry-run. Verified: `npm run check:actionlint` green, `wrangler deploy --dry-run --env=""` resolves the prod bundle without credentials, `npm run lint` / `npm run test` / `npm run build` green in the worktree.
- ADR amendment: ADR-0028 Decision (`Secrets`) + Rationale rewritten so the recorded flow matches the shipped shape — the production Worker secret is refreshed by `deploy-prod` from the GitHub secret on every release deploy (per ticket AC-2), not "put once by a human".
- Spec drift flagged for ticket 07's reconciliation: spec l.51/l.67 still describe secret provisioning as "put once per env" / out-of-scope automation — same handling as ticket 05 (ADR is decision of record; the spec stays the planning text).