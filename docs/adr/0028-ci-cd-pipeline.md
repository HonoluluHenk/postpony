# ADR 0028: GitHub Actions Verify Gate + Tag-Driven Workers Deploy

We will gate every push/PR with a GitHub Actions **Verify Gate** (lint → test → build → e2e, unit and e2e in parallel) and deploy PostPony to Cloudflare Workers in two stages keyed to releases: `deploy-staging` fires on every `main` merge (and `workflow_dispatch`), while `deploy-prod` fires **only on a `v*` tag push** whose name matches the `package.json` version at that commit. A `npm run release` script scripts the bump → tag → next-`-dev` cycle. This re-selects GitHub Actions for the Worker path after ADR-0010 was superseded by ADR-0018.

## Status

Accepted

## Context

ADR-0010 chose GitHub Actions for the old Docker/Coolify delivery, a premise ADR-0018 replaced with Cloudflare Workers + Turso; ADR-0010 was superseded and never implemented. Today the only gate is a manual `npm run verify`; `worker:build` (wrangler dry-run) is not part of it, and `.github/workflows` does not exist. This ADR records the CI/CD pipeline that actually ships.

## Decision

- **One workflow**, `.github/workflows/ci.yml`, four jobs: `unit`, `e2e` (parallel gate on any push/PR/dispatch/tag), `deploy-staging` (needs both, `main` push or `workflow_dispatch`), `deploy-prod` (needs both, `v*` tag push only).
- The gate's pieces mirror `npm run verify`, with `worker:build` kept as a separate CI-only step in the `unit` job — it does not join the local `verify` script.
- Runner: `ubuntu-latest`, `jdx/mise-action` `mise install` (Node 26 + mkcert + turso from the repo's single toolchain); `engines.node >= 26` documented in `package.json`. E2E certs generated on the runner via `scripts/create-certs.sh`.
- **Staging**: a second Worker, name `postpony-staging`, workers.dev URL, isolated Turso DB, configured as `env.staging` inside the single `wrangler.jsonc`. Deployed on `main` merges and `workflow_dispatch`. One staging slot: last merge wins, no per-PR previews.
- **Production**: `postpony`, custom domain `spielverlegung.date`, deployed **only when a `v*` tag is pushed**. The workflow refuses the deploy if the tag name ≠ `v${npm_package_version}` at the tagged commit — production cannot be reached by an arbitrary merge or a manual dispatch, only by a deliberate release.
- **Release mechanics**: `npm run release` runs the Verify Gate locally, bumps `package.json` to `X.Y.Z`, commits, tags `vX.Y.Z`, bumps back to `X.Y.0-dev` and commits; it prints the `git push`/`git push --tags` commands rather than pushing (the tag push is what triggers CI). A plain `X.Y.Z` (no `-dev` suffix) is also accepted and released as-is: the current `1.0.0` *is* the first release target, so the plan's "must end in `-dev`" guard is deliberately relaxed for the first-release bootstrap.
- **Migrations**: the Worker migrates lazily on first request (`worker.ts`), so the pipeline has no migration step.
- **Secrets**: never committed. `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (account id treated as a secret, not added to `wrangler.jsonc`), and the two `TURSO_DB_AUTH_TOKEN` values are GitHub secrets. Both deploy jobs refresh their Worker secret on every deploy (`wrangler secret put TURSO_DB_AUTH_TOKEN` — staging via `--env staging`, production in `deploy-prod` with no `--env`; each fed from its GitHub secret and failing loud if the secret is missing). DB URLs remain committed vars. This per-deploy refresh supersedes the plan's "secrets put once by a human" (spec issue 01/04): rotating a token is now a GitHub-secret edit, with no human re-put and no drift between the two Workers' copies (see Rationale below).
- **Workflow linting (manual-only, `check:actionlint`)**: `actionlint` is an npm devDependency; `npm run check:actionlint` runs it over `.github/workflows/`. The script is deliberately not wired into `verify`/CI, and is named `check:` rather than the plan's `lint:actionlint` so the repo's `lint:*` run-all wildcard cannot auto-wire it into the gate — the workflow is validated by running it, not by linting it in the gate.
- **Release script deliberately not unit-tested**: `scripts/release.mjs` lives outside `src/` and outside the vitest coverage include, so the enforced-coverage surface does not grow with release tooling. Its mechanics are exercised by the manual first-release checklist (issues 01/04) instead of a unit test — a deliberate exception to the test-everything reflex (spec "Testing Decisions").
- Branch protection on `main` requiring `unit` + `e2e` status checks is a repo-admin step (not in the workflow).

## Rationale

GitHub Actions is where the code already lives (zero extra tooling) and pairs directly with Workers deploys. Staging-first isolates the production Turso DB and custom domain from every merge. Production behind a release tag keeps a human decision — *this commit is the next release* — in the blast-radius path without a continuous-deployment surface: nothing a merge does can promote, and the tag/version guard plus the local gate in the release script keep tag and manifest in lock step. Keeping `worker:build` out of `npm run verify` preserves a fast local gate while CI owns disposable bundle validation. Mise-provided Node keeps one toolchain source (`mise.toml`) across local and CI. Both environment tokens live in GitHub secrets (spec decision, ticket 01) and every deploy refreshes the Worker secret automatically — rotating a token is a secret edit with no human re-put on either worker, at the cost of the production token also sitting in GitHub's secret store (the "deploys rarely" saving was judged smaller than the second, unrefreshed copy of prod's token drifting out of sync). Both workers hold the token only as a Worker secret, never a committed var.

## Consequences

- Every `main` merge proves lint, tests (90% coverage thresholds), build, bundle validity, and the e2e suite, then updates staging. Bugs on `main` stop reaching the shared staging slot.
- Production updates only via release tags; a tag push is the single release gesture, and the `-dev` post-bump keeps `main` versioned ahead of the last release.
- New `env.staging` in `wrangler.jsonc`; staging DB URL is a committed var, staging token a secret.
- CI needs the `game-scheduler.localhost` cert (gitignored locally), so the workflow generates it on the runner.
- arc42 §07/§11 and §02 record the pipeline; ADR-0010's residual intent is superseded by this ADR, which cross-references ADR-0018 (Cloudflare Workers + Turso is the delivery target this pipeline deploys).

## Alternatives considered

- **`workflow_dispatch` promotes to production.** Rejected (2026-09-21 plan change): an ad-hoc dispatch makes "is this release-worthy?" a silent decision and invites unreleased deploys; a `v*` tag is an explicit, inspectable release artifact with a built-in version contract.
- **Split `ci.yml` and `deploy-prod.yml`.** Rejected: one file shares setup and lets a tag run its own `needs` chain.
- **Auto-deploy production.** Rejected: a bad bundle or token would hit production with no human check.
- **`setup-node` + mise scoped to mkcert.** Rejected: mise already pins Node (`mise.toml`); one provisioning path is simpler.
- **Coverage gate rework (issue 02).** Not an ADR: thresholds are already committed and enforced.