# Spec: Deploy PostPony on Cloudflare Workers

Status: ready-for-agent

## Problem Statement

PostPony is a server-side-rendered (SSR) Hono + Eta + HTMX application for postponing sports matches. It currently runs only as a long-lived Node process that terminates its own TLS and reads a SQLite file from disk. The maintainer wants a **cheap, near-zero-cost host** given the app expects only the occasional user per week. The current architecture is coupled to a VM-style runtime (in-process TLS via `node:https`, a writable filesystem for `node:fs`, and a local SQLite file), which makes the cheapest hosting options (passes that terminate TLS at the edge and run ephemeral, stateless workers) impossible without code changes. There is no deployment target that works on a free tier today.

## Solution

Deploy PostPony to **Cloudflare Workers** (free tier, no credit card) with **Turso**
(`libsql://`, per ADR-0014) as the production `SessionStore` backend, and **Cloudflare Workers Assets** serving the static `src/public` directory. Decouple the two things that currently force a VM:

1. Make **TLS termination optional via configuration** so the app can run plain HTTP behind Cloudflare's edge TLS instead of opening its own `node:https` server.
2. Move persistence entirely to **Turso** (remote `libsql://`), removing the dependency on a writable local filesystem.

Replace the `bcryptjs` password hashing with the **platform built-in Web Crypto
`crypto.subtle` PBKDF2** so the security model (dual-password: owner password + invitation password, per ADR-0002) works identically on Node and on Workers with no `nodejs_compat`
shim and with one fewer dependency. Precompile Eta templates into an in-memory map so SSR works without `node:fs` on Workers, while local development keeps the existing on-disk template loading.

Scope of this ticket: **scaffold only** — produce a runnable Worker entry, `wrangler.toml`, the app-extraction refactor, the crypto migration, and the template precompile, while keeping `npm run dev` working locally. It stops *before* `wrangler deploy` and before any production flip.

## User Stories

1. As a maintainer, I want the app to run on Cloudflare Workers' free tier, so that hosting costs stay near zero for an app with only occasional weekly users.
2. As a maintainer, I want the app to terminate TLS optionally via configuration, so that it can run behind Cloudflare's edge TLS instead of requiring its own certificate files.
3. As a maintainer, I want the app to run plain HTTP when `APP_TLS_ENABLED=false`, so that a platform or reverse proxy can own TLS termination.
4. As a maintainer, I want local `npm run dev` to keep working exactly as today (HTTPS + fixtures + local SQLite), so that the refactor does not regress the development workflow.
5. As a maintainer, I want the production `SessionStore` backed by Turso (`libsql://`), so that sessions survive ephemeral / stateless worker instances (per ADR-0014).
6. As a maintainer, I want the same `RescheduleSession` JSON-blob storage semantics on Turso as on the local SQLite file, so that no session data model changes are required.
7. As a maintainer, I want `APP_DB_URL` and `APP_DB_AUTH_TOKEN` supplied via Worker env bindings / secrets, so that credentials are not baked into the bundle.
8. As a maintainer, I want the `click-tt.ch` scraper to keep working in production, so that match creation by scraping functions on the new host.
9. As a maintainer, I want the `click-tt.ch` fixtures path (`APP_USE_FIXTURES`) to remain dev/test-only, so that no `node:fs` reads are triggered in production on Workers.
10. As a player creating a session, I want to set an owner password and an invitation password, so that I retain the dual-password security model (per ADR-0002) unchanged.
11. As a player joining a session, I want my invitation password verified, so that only invited participants can join (per ADR-0002 / ADR-0013).
12. As a player editing a session, I want my owner password verified, so that only the owner can modify the `RescheduleSession`.
13. As a maintainer, I want password hashing to use Web Crypto `crypto.subtle` PBKDF2, so that hashing works natively on both Node and Cloudflare Workers without `nodejs_compat`.
14. As a maintainer, I want `bcryptjs` removed from dependencies, so that the bundle and the dependency surface shrink and no compat shim is needed for crypto.
15. As a maintainer, I want Eta SSR to render on Workers without `node:fs`, so that the hypermedia/HTMX responses (including `hx-swap-oob` fragments) are produced correctly.
16. As a maintainer, I want Eta templates precompiled into an in-memory map, so that Worker instances render `.eta` files without reading the filesystem.
17. As a developer, I want colocated `.eta` files under `src/routes/` to remain the source of truth (per ADR-0008), so that the precompile step is a build artifact, not a rewrite.
18. As a maintainer, I want static assets (`/assets/*`, including BeerCSS vendor and design tokens) served by Cloudflare Workers Assets, so that no application code serves them.
19. As a maintainer, I want the app assembled behind a single `buildApp(sessionStore)`
    seam, so that it is reusable by both the Node bootstrap and the Worker entry.
20. As a maintainer, I want a `wrangler.toml` describing the Worker, its assets directory, and its env vars, so that deployment is a single `wrangler deploy` command later.
21. As a maintainer, I want the project to stay type-checked and lint-clean after the refactor, so that CI (`npm run verify`) keeps passing.
22. As a maintainer, I want the existing unit and e2e test suites to keep passing, so that the refactor does not change observable behavior.
23. As a maintainer, I want the deployment decision recorded as an ADR, so that ADR-0006's
    "Dockerized VPS" primary strategy is superseded/extended by a Cloudflare Workers option.
24. As a maintainer, I want the click-tt.ch scraping egress verified from Cloudflare's IP range before going to production, so that we know free-tier worker IPs are not blocked.

## Implementation Decisions

- **Single assembly seam**: A `buildApp(sessionStore)` function constructs the Hono app (language middleware, `sessionStore` injection middleware, route registration for
  `/`, `/create`, `/edit`, `/join`, and the `onError` handler). This is the highest seam; both runtimes import it. The Node `index.ts` keeps only bootstrap concerns (config load, SQLite/Turso client creation, TLS-gated HTTPS server). The Worker entry keeps only env-binding → `sessionStore` wiring and `export default { fetch }`.
- **TLS gating**: Add a configuration flag (e.g. `APP_TLS_ENABLED`) defaulting to `true`. When `true` the Node bootstrap opens its own `node:https` server as today. When `false`
  it runs plain HTTP (suitable behind Cloudflare's edge). Local `npm run dev` is unchanged because the default stays `true`.
- **Persistence**: Production uses Turso via `libsql://` + auth token (ADR-0014 already mandates Turso for production). The `SqliteSessionStore` (now a misnomer but kept as the
  `SessionStore` implementation) already speaks `@libsql/client` and accepts both `file:`
  and `libsql://` URLs, so no store-interface change is needed — only the prod URL moves to a Worker env binding/secret.
- **Crypto migration**: `hashPassword` / `comparePassword` move from `bcryptjs` to Web Crypto `crypto.subtle` PBKDF2-HMAC-SHA256 with a per-password random salt and a high iteration count. Because `crypto.subtle` is async, these functions become async and their callers (`create-post`, `match-post` for hashing; `change-utils`, `join-utils` for comparison) await them. `generateId` / `generateRandomPassword` remain (prefer
  `crypto.randomUUID` / `crypto.getRandomValues`, both Web Crypto built-ins). The stored hash format changes from bcrypt to PBKDF2; this is safe because production starts from a fresh Turso database with no pre-existing password hashes.
- **Template precompile**: Eta templates are colocated `.eta` files under `src/routes/`
  (ADR-0008). A build step compiles them into an in-memory template map; the `App` render path uses that map on Workers and falls back to on-disk loading on Node. No template source files are rewritten.
- **Static assets**: `src/public` is served by Cloudflare Workers Assets (configured in
  `wrangler.toml`), so the `serveStatic` middleware is Node-only and not used on Workers.
- **Worker entry**: A root `worker.ts` imports `buildApp`, constructs the `SessionStore`
  from `env` bindings, and exports `{ fetch: app.fetch }`. Configuration (db url, base url, hostname) is read from Worker `vars`; the auth token from a `wrangler secret`.
- **Logger**: `pino` may require `nodejs_compat` on Workers; if it fights the runtime the logger is swapped for a minimal console-based logger behind the existing `logger` export. This is an implementation detail resolved during scaffolding, not a behavioral change.
- **Dev fixtures isolation**: `click-tt-scraper`'s `node:fs` fixture reads are dev/test only and not executed in production; the import is guarded so the Worker bundle stays free of runtime `fs` usage.
- **ADR update**: ADR-0006 is extended (or a new ADR added) to record Cloudflare Workers + Turso + Workers Assets as an approved, zero-cost deployment strategy, superseding the Dockerized-VPS primary in ADR-0006 for this deployment.

## Testing Decisions

- A good test asserts **external behavior** through the `App` / `buildApp` seam (responses, status codes, rendered HTML, redirects), not implementation internals (which crypto backend or how a template is loaded).
- **`buildApp` seam tests**: construct the app with an in-memory `SessionStore`
  (`MemorySessionStore`) and assert route behavior end-to-end — mirroring the existing
  `*.spec.ts` handler tests that build a mock Hono context via `App.create`.
- **Crypto tests**: assert PBKDF2 hash/compare round-trip, that a wrong password fails, and that hashes are salted (two hashes of the same password differ). Update existing
  `create-post`, `join`, and `change-utils` specs that currently call the sync
  `hashPassword` to the new async API.
- **Template precompile tests**: assert that `App.render` produces expected HTML using the in-memory map (no `fs`), keeping parity with on-disk rendering used in dev.
- **Prior art**: existing Vitest handler specs (`edit-handlers.spec.ts`, `app-handler.spec.ts`,
  `create-post.spec.ts`, `join-handlers.spec.ts`) for the mock-context pattern; existing e2e Playwright specs (`e2e-tests/`) for the happy-path/error-path coverage requirement;
  `builders.spec.ts` for fixture-builder drift checks if models change.
- **Local regression**: `npm run dev` + a manual smoke of create/join/edit must remain green; CI `npm run verify` (lint → test → build → e2e) must pass after the refactor.

## Out of Scope

- Actual `wrangler deploy` and any production DNS / `*.workers.dev` custom-domain setup.
- Pushing Turso auth token secrets to Cloudflare.
- The click-tt.ch egress smoke-test from Cloudflare IPs (post-deploy verification, per user story 24).
- Any change to the `RescheduleSession` / `Postponement` / `Player` / `ProposedDate` /
  `Vote` data model.
- Migration of any existing password hashes (none exist; fresh Turso DB).
- CI/CD pipeline changes (GitHub Actions for auto-deploy) — deferred; manual deploy for now.
- Changes to the dual-password security model (ADR-0002) or join-participant identity (ADR-0013) beyond the crypto backend swap.

## Further Notes

- This deployment strategy is a **new alternative** to ADR-0006's Dockerized-Coolify-VPS primary and should be reconciled with that ADR (extend it or supersede with a dedicated ADR) so the architecture record stays consistent.
- Cloudflare Workers free tier has request and CPU-time limits; SSR + a single upstream
  `click-tt.ch` fetch (I/O wait, not CPU) is expected to fit comfortably, but the egress check (user story 24) is the real risk and is intentionally left to post-deploy.
- The refactor intentionally preserves local development semantics (HTTPS, fixtures, local SQLite) so the team can keep iterating locally while the Worker path is scaffolded.
