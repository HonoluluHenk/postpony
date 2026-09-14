---
name: app-arc42-docs
description: "How the arc42 architecture documentation works in this project (PostPony) and which sections to update for which change. Use whenever you add or change a route, module, external dependency, deployment config, or ADR."
---

# arc42 documentation

The architecture documentation lives in `docs/arc42/` — 12 numbered section files plus `README.md` (the index). It documents the system **as built**. Keep it honest: it must reflect the code, not intent.

## When to update which section

| You changed …                                                                | Update …                                                       |
|------------------------------------------------------------------------------|----------------------------------------------------------------|
| a route, handler, or view component                                          | `05-building-block-view.md` (route table / module table)       |
| a runtime flow or interaction sequence                                       | `06-runtime-view.md`                                           |
| a new external system or interface (scraper target, API, storage)            | `03-context-and-scope.md`                                      |
| a dependency, toolchain, or lint/TS constraint                               | `02-constraints.md`                                            |
| deployment/infra (wrangler, Docker, Turso, TLS, config keys)                 | `07-deployment-view.md`                                        |
| a cross-cutting concern (validation, i18n, security, a11y, logging, testing) | `08-concepts.md`                                               |
| an ADR (add, accept, supersede, withdraw)                                    | `09-decisions.md` (pointer only — never duplicate ADR content) |
| a new domain term                                                            | `CONTEXT.md` and the `12-glossary.md` pointer                  |
| discovered or resolved debt                                                  | `11-risks.md`                                                  |

## Rules

- Every edit bumps the "last verified against commit <sha>" line in `docs/arc42/README.md` to the current `git rev-parse HEAD`.
- Diagrams are Mermaid; keep them valid and minimal.
- §9 and §12 are pointers only (to `docs/adr/` and `CONTEXT.md`) — never duplicate their content.
- Requirements are "as built": when a capability is added or removed, update the list in `01-introduction.md` (and `1.1.1` if a non-goal changes).
- Prefer fixing drift over documenting it, but record what you don't fix in `11-risks.md`.
