# 04 — Precompile Eta templates to an in-memory map

**What to build:** Eta templates are colocated `.eta` files under `src/routes/` (ADR-0008). A build step compiles them into an in-memory template map so the `App` render path can produce HTML without `node:fs` — required for Cloudflare Workers, which has no filesystem. On Node, rendering continues to use on-disk loading so local development is unchanged. From the user's perspective SSR (including HTMX `hx-swap-oob` fragments and layouts) renders identically in both modes; only the loading mechanism differs. No template source files are rewritten.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] A build step compiles all colocated `.eta` templates into an in-memory map artifact.
- [ ] `App.render` selects the in-memory map on Workers and disk loading on Node.
- [ ] No template source files are modified.
- [ ] A test asserts `App.render` produces expected HTML via the in-memory map with no `node:fs` usage.
- [ ] `npm run dev` still renders via disk loading.
