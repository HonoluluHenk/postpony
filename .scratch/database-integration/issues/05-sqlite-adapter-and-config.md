# 05 — SQLite adapter + config + production wiring

**What to build:** `@libsql/client` added as a dependency. `SqliteSessionStore` implements the `SessionStore` seam backed by a SQLite file. Config gains `APP_DB_URL` and `APP_DB_AUTH_TOKEN`. The dev server creates a `SqliteSessionStore` on startup, runs the migration (`CREATE TABLE IF NOT EXISTS`), and passes it to the app. Sessions survive a server restart.

**Blocked by:** 04 — Contract: remove old `app.sessions`.

**Status:** ready-for-agent

- [ ] `@libsql/client` installed in `package.json`
- [ ] `SqliteSessionStore` class implements `SessionStore` using `createClient`
- [ ] `migrate()` method runs `CREATE TABLE IF NOT EXISTS sessions (id TEXT PK, club_id TEXT, data TEXT)`
- [ ] `get()` deserialises the JSON `data` column into a `RescheduleSession`
- [ ] `save()` serialises the session to JSON and upserts via `ON CONFLICT(id) DO UPDATE`
- [ ] Config entries `db-url` (default `file:./data/postpony.db`) and `db-auth-token` added
- [ ] `src/index.ts` creates `SqliteSessionStore`, calls `migrate()`, passes to the factory
- [ ] `npm run dev` — create a session, restart server, edit the session works (survived restart)
- [ ] `npm run test` passes; `npm run lint` passes; `npm run e2e` passes
