# 02: Gate-only workflow

**What to build:** The core of CI that the whole story hangs on: a GitHub Actions workflow that runs the full Verify Gate (lint → test with the 90% per-file coverage thresholds → build → e2e) as two parallel jobs, `unit` and `e2e`, on every push, pull request, and manual dispatch — and whose `unit` job also validates the Worker bundle. After this ticket, every push to any branch is provably green or red in the GitHub checks UI.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] A workflow runs on push to any branch, pull requests, `workflow_dispatch`, and tag pushes; it is consistent with ADR-0018 (Cloudflare Workers) rather than the old Docker/Coolify path.
- [x] Two parallel gate jobs: `unit` (lint, unit + browser tests, build, coverage) and `e2e` (Playwright against the dev-server shape with fixtures), both required status checks.
- [x] The `unit` job includes a separate `worker:build` step that validates the Worker bundle in dry-run mode; it is NOT folded into `npm run verify`.
- [x] Runner groundwork: `ubuntu-latest` with `jdx/mise-action` running `mise install` from the repo's single toolchain (`mise.toml`); `package.json` documents the Node floor (`engines.node >= 26`); `wrangler` comes from the existing npm devDependency (no separate wrangler setup).
- [x] E2E runs over HTTPS: the workflow generates the local cert on the runner via the existing create-certs script (mkcert from mise) before the e2e job.
- [x] `actionlint` is added as an npm devDependency with a **manual** `lint:actionlint` npm script for workflow-local YAML checking; it is NOT wired into `verify` or this workflow's jobs.
- [x] No secrets are referenced or required by this ticket — the gate jobs are secret-free.
- [x] Branch protection on `main` requiring the two checks is noted as a repo-admin step (ticket 01), not done here.

**Comments:** Deploy stages are deliberately NOT part of this ticket (tickets 05/06 build on it). Split out of the former "No CI/CD pipeline" ticket (2026-09-22) so the gate is its own demoable vertical slice; the staging/prod deployment ACs moved to tickets 05 and 06.

## Comments

- Commits: `dc368b8` (ticket done), `a5d68d4` (arc42 verified-commit bump), `be76449` (review), `f016ca2` (review-fixed).
- One-line summary: gate-only GitHub Actions workflow (`unit` + `e2e`) lands the full Verify Gate on every push/PR/dispatch/tag, with actionlint as a manual-only npm script and `engines.node >= 26`.
- Naming deviation (needs human sign-off): AC-6 names the manual script `lint:actionlint`, but this repo's `lint`/`verify` run an npm-run-all `lint:*` wildcard that matches **any** single-level `lint:<name>` script — a literal `lint:actionlint` would be auto-wired into `verify` and CI, violating AC-6's "NOT wired into `verify`" constraint. Implemented as `check:actionlint` instead; rationale documented in `app-npm-scripts/SKILL.md` and arc42 §7.5.
- Branch protection on `main` requiring `unit` + `e2e` (AC-8) is a repo-admin step outside this workflow — tracked in ticket 01, not done here.
- Actionlint runs manually via `npm run check:actionlint` (verified green against `ci.yml`), never in the workflow's own jobs.
- Review (`be76449`/`f016ca2`): both axes clean — no missing ACs, no scope creep; only doc-honesty nits, both fixed (arc42 Node floor row, `# ponytail` duplication note in `ci.yml`).