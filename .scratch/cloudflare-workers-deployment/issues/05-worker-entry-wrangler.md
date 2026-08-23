# 05 — Add Cloudflare Worker entry + `wrangler.toml`

**What to build:** A Cloudflare Workers deployment target for PostPony. A root `worker.ts` imports the shared `buildApp` seam, constructs a Turso-backed `SessionStore` from Worker env bindings, and exports `{ fetch: app.fetch }`. A `wrangler.toml` describes the Worker (main entry, `Workers Assets` serving `src/public`, config `vars`, and the Turso auth-token as a secret). Any `pino`/runtime-compat friction is resolved during scaffolding (e.g. swapping to a console-based logger behind the existing `logger` export if needed). This is **scaffold only**: the Worker builds/dry-runs successfully, but no `wrangler deploy` is performed and no secrets are pushed. `npm run dev` remains fully green.

**Blocked by:** 01 — Extract `buildApp(sessionStore)` assembly seam; 03 — Migrate password hashing to Web Crypto PBKDF2 (drop `bcryptjs`); 04 — Precompile Eta templates to an in-memory map.

**Status:** done

- [x] `worker.ts` builds the app with a Turso-backed `SessionStore` from env bindings and exports a `fetch` handler.
- [x] `wrangler.toml` wires the Worker entry, `Workers Assets` for `src/public`, config `vars`, and a Turso auth-token secret slot.
- [x] The `click-tt.ch` scraper's dev-only `node:fs` fixture reads are guarded so the Worker bundle has no runtime `fs` usage.
- [x] The Worker build / dry-run succeeds (no `nodejs_compat` required for crypto).
- [x] `npm run dev` and `npm run test` remain green.
- [x] No `wrangler deploy` is run and no secrets are published.

## Notes

- The Worker entry uses `@libsql/client/web` for Turso; `SqliteSessionStore` now
  lazy-loads the client (web for `libsql://`, node for `file:`), keeping both
  clients out of the Worker bundle via non-literal dynamic imports.
- `config.ts` no longer statically imports `node:fs`/`node:path`/`node:process`;
  `.env` loading moved to an async `loadDotEnv()` called from `src/index.ts`.
- `logger.ts` loads `pino` only under Node; a console logger backs the export on
  Workers (pino pulls in `node:stream`).
- `nodejs_compat` is enabled solely because `convict` transitively pulls in
  `yargs-parser` (static `require` of node builtins). Those builtins are never
  called at runtime in the Worker; crypto stays on Web Crypto, so no
  `nodejs_compat` is needed for crypto.
