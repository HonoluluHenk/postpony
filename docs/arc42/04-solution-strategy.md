# 4. Solution Strategy

The system is a server-rendered, hypermedia-driven web app with a deliberately small surface.

**Core strategy decisions:**

1. **SSR + HTMX, no SPA.** Every interaction is an HTTP request returning HTML; HTMX swaps fragments (`outerHTML` by default). Server owns all state and rendering. Keeps logic on the server and the client to a thin `ui.js`/`spinner-module.js`.

2. **Pure domain module with an overridable seam.** All postponement rules live in `PostponementRules` (`src/lib/postponement.ts`) as pure `session → session` functions. Non-determinism (ids, clock) sits behind `newId()`/`now()`; tests subclass with a `FakePostponementRules`. This is the primary testability strategy.

3. **Whole-document persistence behind a `SessionStore` seam.** A `Postponement` serialises to one JSON blob in a `sessions(id, club_id, data)` table. `MemorySessionStore` for tests, `SqliteSessionStore` for dev/prod. The seam isolates storage from the domain and from the HTTP layer.

4. **Four-secret security model.** Four per-postponement secrets replace the old dual-password model (ADR-0025): an organizer-captain password (full edit, hashed, plaintext shown once), an opponent-captain password (scoped to the side opposite `organizerTeam`), and a home/away player password each (per-team vote access). No accounts, no recovery, no cookies for auth; the three shareable plaintexts (opponent-captain, home-player, away-player) are persisted so share links render.

5. **Worker/Node parity.** One codebase runs under `@hono/node-server` (dev) and Cloudflare Workers (prod). Node-only modules (`node:fs`, `node:path`, `node:process`, pino, the libSQL node client) are imported via non-literal dynamic `import()` so they are excluded from the Worker bundle. A `process` shim (`src/worker-runtime.ts`) lets convict load on Workers.

6. **Scrape-only creation.** The click-tt scrape wizard is the only way to create a postponement (ADR-0024). The Match and team identities are bound permanently; there is no manual match entry.

7. **Offline-deterministic integration tests.** The scraper reads local HTML fixtures when `APP_CLICK_TT_FIXTURES_DIR` is set; e2e always runs against fixtures.

For the detailed cross-cutting techniques (validation, i18n, HTMX partials, error handling, security), see §8.
