# 04 — Contract: remove old `app.sessions`

**What to build:** The old `private static readonly sessions` and `readonly sessions` properties are deleted from `App`. No dead code remains. The app works identically — all data access now goes through the `SessionStore` seam.

**Blocked by:** 02 — Migrate edit handlers to SessionStore, 03 — Migrate join handlers to SessionStore.

**Status:** completed

- [x] `private static readonly sessions` and `readonly sessions` removed from `App` class
- [x] No remaining references to `app.sessions` anywhere in `src/`
- [x] `npm run test` passes; `npm run lint` passes; `npm run e2e` passes

## Comments

The `App.sessions` properties were already removed in the foundational
`SessionStore` seam commit (`218bb40`, "replace in-memory sessions with
SessionStore seam + SQLite"): `readonly store: SessionStore` replaced
`private static readonly sessions`/`readonly sessions`, and all handlers were
migrated to async `app.store` access (tickets 02 and 03). A full audit of
`src/` finds no `app.sessions` nor `sessions` property on `App`. Verification:
238 unit tests pass, `npm run lint` clean, 66 e2e tests pass.
