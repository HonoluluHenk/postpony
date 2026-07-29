# 02 — Migrate edit handlers to SessionStore

**What to build:** All four edit handlers (`edit-id-get`, `players-post`, `proposed-dates-post`, `venue-post`) switch from `app.sessions` to `await app.store.get()` / `await app.store.save()`. Sync handlers become async where needed. The full edit flow (add player, add proposed date, change venue limit) works end-to-end.

**Blocked by:** 01 — Prefactor: SessionStore seam + migrate create flow.

**Status:** ready-for-agent

- [ ] `handleEditGet` reads session via `await app.store.get(id)` and becomes async
- [ ] `handleEditPlayersPost` reads/writes via `app.store`
- [ ] `handleEditProposedDatesPost` reads/writes via `app.store`
- [ ] `handleEditVenuePost` reads/writes via `app.store`
- [ ] Edit-handler tests inject `MemorySessionStore` and await all handler calls
- [ ] `npm run test` passes; `npm run lint` passes; `npm run e2e` passes
