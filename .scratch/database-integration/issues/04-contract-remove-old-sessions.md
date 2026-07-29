# 04 — Contract: remove old `app.sessions`

**What to build:** The old `private static readonly sessions` and `readonly sessions` properties are deleted from `App`. No dead code remains. The app works identically — all data access now goes through the `SessionStore` seam.

**Blocked by:** 02 — Migrate edit handlers to SessionStore, 03 — Migrate join handlers to SessionStore.

**Status:** ready-for-agent

- [ ] `private static readonly sessions` and `readonly sessions` removed from `App` class
- [ ] No remaining references to `app.sessions` anywhere in `src/`
- [ ] `npm run test` passes; `npm run lint` passes; `npm run e2e` passes
