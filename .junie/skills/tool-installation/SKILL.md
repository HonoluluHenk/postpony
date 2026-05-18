---
name: tool-installation
description: Install extra CLI tools for PostPony via mise-en-place so versions stay reproducible across machines and CI.
---

# Tool Installation via mise

This project uses [mise-en-place](https://mise.jdx.dev/) to manage developer
tool versions. Whenever you (or the user) need an extra CLI to perform a
task, check whether `mise` can provide it **before** reaching for `apt`,
`brew`, a `curl | sh` installer, or a global `npm install -g`.

## When to Use This Skill

Use this skill whenever:

- A task requires a tool that is not already on `PATH`
  (e.g. `jq`, `yq`, `shellcheck`, `gh`, `hadolint`, a specific `node` /
  `python` / `go` version).
- You are tempted to run `sudo apt install ...`, `brew install ...`,
  `curl ... | sh`, or `npm install -g ...`.
- You need to pin a new tool version for the whole team.
- The current Node.js (or other pinned tool) version on the machine does
  not match what the project expects.

## Decision Flow

1. Is the tool already available via `mise`? Check the registry:
   `mise registry | grep -i <tool>` or look it up at
   <https://mise.jdx.dev/registry.html>.
2. If yes → add it with `mise use <tool>@<version>` (this pins it in
   `mise.toml` and installs in one step).
3. If no → try a `mise` backend in this order: `aqua:`, `ubi:`, `npm:`,
   `pipx:`, `cargo:`, `go:`, then an asdf-compatible plugin. Only if
   none of these work, fall back to another mechanism, and document the
   exception in your change description.

Do **not** silently install tools outside of `mise`. Reproducibility is the
whole point of pinning versions in `mise.toml` and `mise.lock`.

## How to Add a Tool

1. Check whether the tool is already pinned and which version is active:

   ```shell
   mise ls
   ```

   Registry names can differ from binary names (e.g. `node` vs `nodejs`),
   so try variations if the first lookup fails.

2. Discover the available versions in the registry:

   ```shell
   mise ls-remote <tool>
   ```

   If `ls-remote` fails, the tool is not in the registry — go back to the
   Decision Flow above and pick a backend (`aqua:`, `ubi:`, …).

3. Pin and install in one step. This edits `mise.toml` and installs the
   tool:

   ```bash
   mise use <tool>@<version>
   ```

   Use `mise install <tool>@<version>` only when you want to install
   without changing `mise.toml`.

4. Refresh the lockfile so CI and other contributors get the same
   resolved versions:

   ```bash
   mise lock
   ```

   The project's lockfile lives at `/mise.lock` and is committed. **Commit
   both `mise.toml` and `mise.lock`** in the same change.

5. Verify the tool is on `PATH` inside the mise-managed shell:

   ```bash
   mise exec -- <tool> --version
   ```

   or simply `<tool> --version` if your shell already activates `mise`.

## Current Pinned Tools

The canonical list lives in `mise.toml`. As of this writing:

| Tool     | Pin (`mise.toml`) | Resolved (`mise.lock`) | Purpose                                                 |
|----------|-------------------|------------------------|---------------------------------------------------------|
| `node`   | `26`              | `26.1.0`               | Runtime for the Hono server and all npm scripts.        |
| `mkcert` | `1`               | `1.4.4`                | Generate local HTTPS certs (`scripts/create-certs.sh`). |

Note: `node` is currently pinned to the `26.x` line (a non-LTS release).
If a task requires LTS guarantees, propose moving to `24` or `22` via an
ADR.

If you bump or add a tool, update this section together with `mise.toml`
and `mise.lock`.

## Common Commands

```bash
mise install                 # install everything pinned in mise.toml
mise use <tool>@<ver>        # pin + install in one step (updates mise.toml)
mise install <tool>@<ver>    # install a version without touching mise.toml
mise use --rm <tool>         # remove a pin from mise.toml
mise lock                    # refresh mise.lock from mise.toml
mise ls                      # show installed tools and active versions
mise ls-remote <tool>        # list versions available for <tool>
mise registry                # search the tool registry
mise exec -- <cmd>           # run <cmd> with the project's tool versions
mise upgrade                 # upgrade tools within the pinned constraints
```

## Conventions and Gotchas

- Always commit `mise.lock` together with `mise.toml` (see "How to Add a
  Tool" above). A missing lockfile update is treated as a bug.
- Prefer major-version pins (e.g. `"1"`, `"26"`) unless a task explicitly
  requires an exact patch version. This matches the existing entries.
- Do **not** add language runtimes globally on the host; pin them via
  `mise` so CI and local environments agree.
- Prefer `package.json` for project-local JS dependencies (Vitest,
  Playwright, TypeScript, Vite, etc.); use `mise` for system-level CLIs
  and language runtimes. `mise`'s `npm:` backend exists but should be
  reserved for CLIs that need to be available outside `npm` scripts.
- If a tool genuinely cannot be installed via `mise`, document the reason
  in the PR/commit and propose an ADR if it becomes a recurring need.
