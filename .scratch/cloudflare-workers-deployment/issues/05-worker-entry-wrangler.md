# 05 — Add Cloudflare Worker entry + `wrangler.toml`

**What to build:** A Cloudflare Workers deployment target for PostPony. A root `worker.ts` imports the shared `buildApp` seam, constructs a Turso-backed `SessionStore` from Worker env bindings, and exports `{ fetch: app.fetch }`. A `wrangler.toml` describes the Worker (main entry, `Workers Assets` serving `src/public`, config `vars`, and the Turso auth-token as a secret). Any `pino`/runtime-compat friction is resolved during scaffolding (e.g. swapping to a console-based logger behind the existing `logger` export if needed). This is **scaffold only**: the Worker builds/dry-runs successfully, but no `wrangler deploy` is performed and no secrets are pushed. `npm run dev` remains fully green.

**Blocked by:** 01 — Extract `buildApp(sessionStore)` assembly seam; 03 — Migrate password hashing to Web Crypto PBKDF2 (drop `bcryptjs`); 04 — Precompile Eta templates to an in-memory map.

**Status:** ready-for-agent

- [ ] `worker.ts` builds the app with a Turso-backed `SessionStore` from env bindings and exports a `fetch` handler.
- [ ] `wrangler.toml` wires the Worker entry, `Workers Assets` for `src/public`, config `vars`, and a Turso auth-token secret slot.
- [ ] The `click-tt.ch` scraper's dev-only `node:fs` fixture reads are guarded so the Worker bundle has no runtime `fs` usage.
- [ ] The Worker build / dry-run succeeds (no `nodejs_compat` required for crypto).
- [ ] `npm run dev` and `npm run test` remain green.
- [ ] No `wrangler deploy` is run and no secrets are published.
