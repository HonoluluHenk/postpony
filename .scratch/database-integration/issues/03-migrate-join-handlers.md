# 03 — Migrate join handlers to SessionStore

**What to build:** `requireSessionAndToken` becomes async. All three join handlers (`join-register-post`, `join-vote-post`, `join-get`) switch from `app.sessions` to `await app.store.get()` / `await app.store.save()`. The full join flow (register a player, cast a vote) works end-to-end.

**Blocked by:** 01 — Prefactor: SessionStore seam + migrate create flow.

**Status:** ready-for-agent

- [ ] `requireSessionAndToken` is async and reads via `await app.store.get(id)`
- [ ] All callers of `requireSessionAndToken` correctly `await` it
- [ ] `handleJoinRegisterPost` reads/writes via `app.store`
- [ ] `handleJoinVotePost` reads/writes via `app.store`
- [ ] Join-handler tests inject `MemorySessionStore` and await all handler calls
- [ ] `npm run test` passes; `npm run lint` passes; `npm run e2e` passes
