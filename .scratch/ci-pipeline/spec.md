# ci-pipeline: GitHub Actions Verify Gate + Tag-Driven Workers Deploy

Status: done

## Problem Statement

PostPony ships with no continuous integration and no deployment pipeline. `.github/workflows` does not exist, and the only quality gate is the manual `npm run verify` — lint, tests, build, and e2e run only when a developer remembers to invoke them. Regressions and coverage erosion go unnoticed until a human happens to run the script. There is likewise no way to promote a known-good build to production: deploying means running `wrangler deploy` by hand against an arbitrary checkout.

Coverage is already machine-enforced (vitest thresholds, 90% per file), but nothing runs the whole Verify Gate on a schedule, and nothing guarantees that what reaches production is a vetted, versioned release.

## Solution

A single GitHub Actions workflow runs the **Verify Gate** (lint → test → build → e2e) as two parallel jobs on every push and pull request, so the shared `main` branch is continuously proven good. Deploys are keyed to explicit, inspectable events and never happen by accident:

- **Staging** (`postpony-staging`, a second Worker on a workers.dev URL with its own isolated Turso DB) is deployed automatically on every `main` merge and on manual `workflow_dispatch`.
- **Production** (`postpony`, custom domain `spielverlegung.date`) is deployed **only when a `vX.Y.Z` tag is pushed** — and only if that tag name equals the `package.json` version at the tagged commit.

A `npm run release` script scripts the release mechanics so tag and manifest stay in lock step: it runs the Verify Gate, bumps `package.json` to the release version, commits, tags, bumps back to the next `-dev` version, commits, and prints the push commands for a human to run.

## User Stories

1. As a developer, I want every push and pull request to run the full Verify Gate (lint, unit+browser tests with 90% per-file coverage, build, bundle validation, e2e) automatically, so that I learn about regressions immediately instead of at release time.
2. As a developer, I want the gate to run unit and e2e in parallel, so that the wall-clock time for a CI run stays low.
3. As a developer, I want pushes to `main` to automatically deploy to a staging Worker, so that each merged commit is exercised against a real deployment shape (Workers Assets, Turso, lazy migration) before anything touches production.
4. As a developer, I want `workflow_dispatch` to re-run the gate and update staging, so that I can refresh staging without queueing a dummy commit.
5. As a maintainer, I want production to deploy only when a `v*` tag is pushed, so that a merge, PR, or stray dispatch can never promote to production accidentally.
6. As a maintainer, I want the pipeline to refuse a production deploy unless the tag name equals the `package.json` version at that commit, so that tag and version manifest cannot drift apart in what gets shipped.
7. As a maintainer, I want `npm run release` to run the Verify Gate first and abort on failure, so that a broken build cannot be tagged as a release.
8. As a developer, I want `npm run release` to bump the version, create the `vX.Y.Z` tag, and bump back to the next `-dev` version automatically, so that I never hand-edit `package.json` versions or create mismatched tags.
9. As a developer, I want `npm run release` to refuse when the working tree is dirty, the tag already exists, or the current version does not end in `-dev`, so that release artifacts are reproducible from a clean state.
10. As a developer, I want `npm run release` to print the `git push` / `git push --tags` commands rather than pushing, so that pushing the tag — the trigger for production — is an explicit human action.
11. As a maintainer, I want the staging and production Workers to use their own isolated Turso databases and own secrets, so that staging activity can never mutate production player data.
12. As a maintainer, I want secrets (Cloudflare API token, account id, Turso tokens) provisioned manually per environment and never committed, so that nothing sensitive exists in the repository.
13. As a maintainer, I want the production branch protected so that `unit` and `e2e` must pass before merge, so that the gate is enforced at the collaboration boundary, not just observed.
14. As a maintainer, I want the e2e suite to run over HTTPS against the real dev-server shape (own port, fixtures, generated cert), so that CI exercises the same TLS path as local development.
15. As a developer, I want `npm run worker:build` (wrangler `--dry-run`) available and run in CI as a separate step, so that the Worker bundle is validated without slowing the local `verify` script.
16. As a maintainer, I want the CI/CD decision and the release model recorded in an ADR, so that the "why production is tag-only" reasoning survives the people who made it.
17. As a maintainer, I want a manual `actionlint` npm script available for workflow-local YAML checking, so that I can catch workflow typos without pushing.

## Implementation Decisions

- **Workflow**: one file, `.github/workflows/ci.yml`, four jobs: `unit`, `e2e` (parallel; on any push, PR, `workflow_dispatch`, and tag), `deploy-staging` (needs both; on `main` push or dispatch), `deploy-prod` (needs both; on `v*` tag push only). `worker:build` runs as a separate step inside `unit` — it is deliberately not folded into `npm run verify`.
- **Runner/toolchain**: `ubuntu-latest`; `jdx/mise-action` runs `mise install` from `mise.toml`, which provides Node 26, `mkcert`, and `turso` from the repo's single toolchain source. `package.json` gains `"engines": { "node": ">=26" }` documenting the floor; no `.nvmrc`.
- **Certs**: the workflow generates the `game-scheduler.localhost` cert on the runner via the existing `scripts/create-certs.sh` (mkcert from mise) before e2e, because `developer-local-settings/` is gitignored. `APP_TLS_ENABLED` stays default (true); Playwright's `ignoreHTTPSErrors` already handles the self-signed cert.
- **Staging**: `wrangler.jsonc` gains an `env.staging` block: name `postpony-staging`, workers.dev URL, no custom-domain route, a committed staging `TURSO_DB_URL` var. Single staging slot — last merge wins, no per-PR previews.
- **Production guard**: `deploy-prod` compares the pushed tag name against `v${npm_package_version}` at that commit and refuses on mismatch. The tag is the version; no separate "version manifest" exists.
- **Release script** (`npm run release`): a standalone script in `scripts/` (no unit tests under the vitest coverage path — kept out of `src/`). It runs `npm run verify`, then bumps `package.json` to the next `X.Y.Z` (from a `-dev` value), commits, creates an annotated `vX.Y.Z` tag, bumps back to `X.Y.0-dev` (e.g. `1.0.0` → tag `v1.0.0` → `1.1.0-dev`) and commits, then prints `git push` and `git push --tags` for the human. Fails loudly on a dirty tree, existing tag, or a version that does not end in `-dev`. It never pushes.
- **Versioning scheme**: `X.Y.Z` for releases, `X.Y.0-dev` in between (current `1.0.0` is the first release target).
- **Migrations**: no step in the pipeline — `worker.ts` migrates the store lazily on the first request, so a deploy is simply `wrangler deploy`.
- **`actionlint`**: added as an npm devDependency with a manual `npm run lint:actionlint` script (`actionlint .github/workflows/...`), **not** wired into `verify`/CI jobs — the workflow is validated by running it, not by linting it in the gate.
- **Secrets** (manual, issue 04, human-run): GitHub repository secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (account id treated as secret, not added to `wrangler.jsonc`), `TURSO_DB_AUTH_TOKEN` (prod), `TURSO_DB_AUTH_TOKEN_STAGING`. Worker secrets put once per env via `wrangler secret put TURSO_DB_AUTH_TOKEN`. DB URLs remain committed vars.
- **Branch protection**: `main` requires `unit` + `e2e` status checks — a repository-admin step outside the workflow (no GitHub API access from repo tooling).
- **ADR**: new ADR-0028 "GitHub Actions Verify Gate + Tag-Driven Workers Deploy" records the decision, supersedes ADR-0010's residual GitHub-Actions intent, and cross-references ADR-0018 (Cloudflare Workers). arc42 §02/§07/§11 are updated; `CONTEXT.md` is explicitly **not** — CI/CD is engineering infra, not postponement domain vocabulary.

## Testing Decisions

- The project convention is behavior-first: assert what the user or system experiences, never implementation details. The app code under the pipeline needs no new tests — its gate is the pipeline's own unit/e2e jobs, which already enforce 90% per-file coverage.
- **Release script** is a deliberate exception to the "test everything" reflex: the version math and guards live in a standalone `scripts/` file kept out of the vitest coverage include, covering the decision's *mechanics* by manual smoke (the spec does not require a unit test for it). This keeps the new tooling out of the enforced-coverage surface; correctness is exercised by the manual first-release checklist in issue 04/05.
- **Workflow YAML** is not unit-tested; it is validated two ways: `npm run lint:actionlint` for offline typo/trigger checking (manual), and the real integration run triggered by pushing the branch and later a `v*` tag (issue 04 step 5).
- All real behavior verification (gate green, staging updated, production via tag, guard refuses a mismatched tag) happens as end-to-end verification in the human-run checklist (issue 04), since the artifacts under test are GitHub and Cloudflare infrastructure, not code in this repo.

## Out of Scope

- Per-PR preview Workers (single staging slot only).
- Auto-deploy of production on merge or dispatch (tag-only, by design).
- GitHub branch protection automation via API (repo-admin, human-configured).
- Automating secret provisioning (`wrangler secret:bulk` from GitHub secrets).
- Cloudflare preview/staging environments beyond the single `postpony-staging` Worker.
- Signed tags or provenance attestations.
- Making the release script part of the enforced coverage surface.

## Further Notes

- Staging captures production's lazy-migration behavior honestly: because `worker.ts` migrates on first request, a staging deploy is a faithful rehearsal of what production will do on its next cold start.
- The tag→version guard and the release script each enforce the same invariant from opposite sides (script produces matching pairs; CI rejects mismatches) — belt and suspenders, both cheap.
- The e2e/production gap is a known simplification: Workers execution and Node dev-server execution differ; the ADR and arc42 flag this as accepted, with the staging Worker as the closest automated proxy.
- Seams: highest testable seam is the release script's logic (intentionally not unit-tested, see Testing Decisions); the highest verification seam is the human-run integration checklist, because the seam itself is external infrastructure.

## Comments

- Produced by grilling + domain-modeling sessions (2026-09-21). Decisions: CI + auto-staging in scope; production tag-only; mise provides the toolchain; account_id as secret; manual Turso secrets; split unit/e2e jobs; one workflow file; single staging slot; `engines >=26`; ADR-0028; release script untested standalone; actionlint as manual-only npm script. Full decision history in `.scratch/ci-pipeline/issues/01..05`.