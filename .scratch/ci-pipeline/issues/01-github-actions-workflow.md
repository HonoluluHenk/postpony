# No CI/CD pipeline

Status: ready-for-agent

## Summary

There is no CI. `.github/workflows` does not exist. The only gate is `npm run verify`, run manually.

## Evidence

- `ls .github/workflows` → no such directory.
- ADR-0010 (GitHub Actions) is superseded and was never implemented (its Docker/Coolify premise was replaced by ADR-0018).

## Acceptance criteria

- A CI workflow runs the `npm run verify` gate (lint → test → build → e2e) on push/PR, consistent with ADR-0018 (Cloudflare Workers) rather than the old Docker/Coolify path.
- A `worker:build` (wrangler dry-run) step validates the Worker bundle. Note: `wrangler` is not an npm devDependency — it is a mise-managed tool (`wrangler = "4"` in `mise.toml`). The workflow must set up mise (e.g. `jdx/mise-action`) and run `mise install` before `npm run worker:build`.
