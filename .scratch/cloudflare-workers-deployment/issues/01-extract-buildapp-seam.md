# 01 — Extract `buildApp(sessionStore)` assembly seam

**What to build:** A single reusable function that assembles the full Hono application — language middleware, `SessionStore` injection, route registration for `/`, `/create`, `/edit`, `/join`, and the `onError` handler — so that both the Node bootstrap and the future Cloudflare Worker import the same app. The Node `index.ts` shrinks to config loading, `SessionStore` client creation, and the TLS-gated server. From the user's perspective nothing changes: every route, response, and error page behaves exactly as before, and `npm run dev` plus the existing unit and e2e suites stay green.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] A `buildApp(sessionStore)` function exists and returns a fully wired Hono app (middleware + all routes + error handler).
- [x] `index.ts` delegates app assembly to that function; Node behavior (HTTPS, fixtures, local SQLite) is unchanged.
- [x] `npm run lint` and `npm run test` pass with no behavioral changes.
- [x] Existing handler specs that build a mock context still pass.
