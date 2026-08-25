---
name: setup-worktree
description: Configure PostPony in a git worktree for parallel development — per-worktree .env (branch-derived ports + SQLite path), certs, deps. Use when setting up a fresh worktree to run dev/tests/e2e concurrently with other worktrees, when the app or e2e won't start in a worktree (missing .env, certs, DB), or when parallel agents need distinct APP_PORT / E2E_APP_PORT.
---

# Setup Worktree (PostPony)

The main worktree's `.env`, `developer-local-settings/`, certs, and SQLite DB are git-ignored, so a fresh worktree starts bare. This skill rebuilds them per worktree with parallel-safe ports and a dedicated DB so multiple worktrees can run dev, unit tests, and e2e concurrently.

## Steps

1. From the worktree root, run the setup script:

   ```bash
   ./scripts/setup-worktree.sh            # HTTPS on the default hostname (must be in /etc/hosts)
   ./scripts/setup-worktree.sh --quick    # plain HTTP on localhost, no certs, no hosts check
   ```

   The script derives everything from the branch name: `APP_PORT=3000+hash`, `E2E_APP_PORT=3100+hash`, DB `developer-local-settings/data/postpony-<branch>.db`. A detached HEAD falls back to the short commit hash.

2. Confirm the app serves on its own port:

   ```bash
   npm run dev
   ```

3. For e2e, export the port in the shell first — Playwright reads `E2E_APP_PORT` from the process environment, not `.env`:

   ```bash
   export E2E_APP_PORT=<printed by the script>
   npm run e2e
   ```

## Conventions and Gotchas

- The script overwrites `.env` from `.env-template` and rebuilds `developer-local-settings/` from the committed template; unrelated files in an existing `developer-local-settings/` are kept. Re-running regenerates certs and re-migrates the DB — both idempotent.
- Running it in the main worktree swaps the DB to `postpony-<branch>.db`; back up `.env` first if it holds custom values.
- Ports hash the branch, so the same branch always gets the same ports. If `APP_PORT` or `E2E_APP_PORT` is already taken, export a different value in the shell before `npm run dev` / `npm run e2e`.
- The script only reads `/etc/hosts` — it fails fast when the hostname is missing (skipped by `--quick`). E2E always needs the hosts entry plus TLS, since Playwright pins the `game-scheduler.localhost` hostname.
