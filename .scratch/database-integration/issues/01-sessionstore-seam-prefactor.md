# 01 — Prefactor: SessionStore seam + migrate create flow

**What to build:** A `SessionStore` interface and `MemorySessionStore` adapter so data access sits behind a clean seam. `App` accepts the store via its constructor; the factory passes it through. The create-post handler is the first to use `app.store.save()`. The old `app.sessions` property stays in place for the remaining handlers (expand phase).

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `SessionStore` interface defined with `get(id)` and `save(session)` methods
- [ ] `MemorySessionStore` class implementing the interface via an in-memory `Map`
- [ ] `App` constructor accepts a `SessionStore` parameter and exposes it as `readonly store`
- [ ] `App.create(c, store)` passes the store through
- [ ] The factory (or a `makeAppRequest` wrapper) accepts and forwards the store
- [ ] `handleCreatePost` uses `await app.store.save(...)` instead of `app.sessions[id] = ...`
- [ ] `create-post` test injects `MemorySessionStore` and verifies session is stored
- [ ] `npm run test` passes; `npm run lint` passes; `npm run e2e` passes
